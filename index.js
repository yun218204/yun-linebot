const express = require("express");
const { Client, middleware } = require("@line/bot-sdk");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config(); //會從專案根目錄讀取 .env 檔案把裡面的變數加入到 process.env 中。

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
const client = new Client(config); //用剛剛的 config 建立一個 LINE Bot 的客戶端，可以用來傳送訊息、取得用戶資料等。

const userCategoryMap = {}; // 暫存查詢類型

// LINE Webhook 入口
app.post("/webhook", middleware(config), async (req, res) => {
  const events = req.body.events; //從 LINE 傳來的 request body 中取出所有事件（每則訊息就是一個事件）。
  const results = await Promise.all(events.map((event) => handleEvent(event)));
  res.json(results);
});
//events 是陣列 假設有使用者傳了三句話 就是三個事件 三個events
//event是從events取出來的每個event 單一事件
async function handleEvent(event) {
  const userId = event.source.userId; //取得使用者的 ID

  // 用戶文字訊息

  if (event.type === "message" && event.message.type === "text") {
    const text = event.message.text; //把使用者傳來的訊息存進text

    if (text === "餐廳") {
      userCategoryMap[userId] = ["restaurant", "cafe", "beverage", "tea"];
      return replyLocationPrompt(event.replyToken, "餐廳");
    }
    if (text === "超商") {
      userCategoryMap[userId] = "convenience_store";
      return replyLocationPrompt(event.replyToken, "超商");
    }
    if (text === "加油站") {
      userCategoryMap[userId] = "gas_station";
      return replyLocationPrompt(event.replyToken, "加油站");
    }
    if (text === "景點") {
      userCategoryMap[userId] = "tourist_attraction";
      return replyLocationPrompt(event.replyToken, "景點");
    }
    if (text === "藥局") {
      userCategoryMap[userId] = "pharmacy";
      return replyLocationPrompt(event.replyToken, "藥局");
    }
    if (text === "天氣") {
      userCategoryMap[userId] = "weather";
      return replyLocationPrompt(event.replyToken, "天氣");
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "請使用下方選單查詢 🧭",
    });
  }

  // 使用者傳位置
  if (event.type === "message" && event.message.type === "location") {
    const { latitude, longitude } = event.message; //抓出使用者傳來的位置座標
    const category = userCategoryMap[userId]; //查看使用者有無選擇類型(之前是設定空的讓使用者輸入文字後會判斷啥類型)
    if (!category) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請先從主選單選擇查詢項目 🙏",
      });
    }

    //天氣
    if (category === "weather") {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=zh_tw`;
      const response = await axios.get(url);
      const data = response.data;

      const locationName = data.name;
      const weather = data.weather[0].description;
      const temp = data.main.temp;
      const feelsLike = data.main.feels_like;

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: `📍 位置：${locationName}\n☁️ 天氣：${weather}\n🌡️ 氣溫：${temp}°C\n🥵 體感：${feelsLike}°C`,
      });
    }

    const types = Array.isArray(category) ? category : [category]; //如果是陣列(一次查詢兩種 例如 餐廳 咖啡廳)就用 不是就改陣列
    let allPlaces = [];

    for (const type of types) {
      //types 是陣列，type 是你從 types 裡「拿出來的每一項」
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=1500&type=${type}&language=zh-TW&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const response = await axios.get(url);
      allPlaces.push(...(response.data.results || [])); //等於下面兩句
      // const results = response.data.results || [];
      // allPlaces.push(...results);
    }

    // 去除重複 怕有些墊被一次歸類在三個類型
    const seen = new Set();
    const places = allPlaces.filter((p) => {
      const id = p.place_id;
      if (seen.has(id)) return false; // 這筆看過了，跳過
      seen.add(id); // 沒看過，加進 Set
      return true;
    });

    if (places.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "找不到符合的地點 😢",
      });
    }

    // 做成 Flex card

    const bubbles = places.slice(0, 10).map((place) => {
      const name = place.name;
      const photoRef = place.photos?.[0]?.photo_reference;
      const lat = place.geometry.location.lat;
      const lng = place.geometry.location.lng;
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      const photoUrl = photoRef
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        : "https://via.placeholder.com/400x250?text=No+Image";

      return {
        type: "bubble",
        hero: {
          type: "image",
          url: photoUrl,
          size: "full",
          aspectRatio: "20:13",
          aspectMode: "cover",
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "text",
              text: name,
              weight: "bold",
              size: "lg",
              wrap: true,
            },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              action: {
                type: "uri",
                label: "開啟地圖",
                uri: mapUrl,
              },
              style: "primary",
              color: "#1DB446",
            },
          ],
        },
      };
    });

    //  回傳 Flex Carousel 正確格式
    return client.replyMessage(event.replyToken, {
      type: "flex",
      altText: "這是附近的地點",
      contents: {
        type: "carousel",
        contents: bubbles,
      },
    });
  }

  return Promise.resolve(null);
}

function replyLocationPrompt(replyToken, label) {
  return client.replyMessage(replyToken, {
    type: "text",
    text: `請傳送您的位置，我會幫您查詢附近的 ${label} !`,
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
