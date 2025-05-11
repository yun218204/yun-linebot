const express = require("express");
const { Client, middleware } = require("@line/bot-sdk");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
const client = new Client(config);

const userCategoryMap = {}; // 暫存查詢類型

// LINE Webhook 入口
app.post("/webhook", middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map((event) => handleEvent(event)));
  res.json(results);
});

async function handleEvent(event) {
  const userId = event.source.userId;

  // 用戶文字訊息
  if (event.type === "message" && event.message.type === "text") {
    const text = event.message.text;

    if (text === "餐廳") {
      userCategoryMap[userId] = ["restaurant", "cafe"];
      return replyLocationPrompt(event.replyToken, "餐廳（含飲料店）");
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
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "天氣功能尚未啟用 ☁️",
      });
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "請使用下方選單查詢 🧭",
    });
  }

  // 使用者傳位置
  if (event.type === "message" && event.message.type === "location") {
    const { latitude, longitude } = event.message;
    const category = userCategoryMap[userId];
    if (!category) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請先從主選單選擇查詢項目 🙏",
      });
    }

    const types = Array.isArray(category) ? category : [category];
    let allPlaces = [];

    for (const type of types) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=1500&type=${type}&language=zh-TW&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const response = await axios.get(url);
      allPlaces.push(...(response.data.results || []));
    }

    // 去除重複
    const seen = new Set();
    const places = allPlaces.filter((p) => {
      const id = p.place_id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (places.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "找不到符合的地點 😢",
      });
    }

    // 做成 Flex card

    const bubbles = places.slice(0, 5).map((place) => {
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

    // ✅ 回傳 Flex Carousel 正確格式
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
    text: `請傳送您的位置，我會幫您查詢附近的 ${label} 📍`,
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
