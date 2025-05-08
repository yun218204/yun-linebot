const express = require("express");
const axios = require("axios");
require("dotenv").config();

const { Client, middleware } = require("@line/bot-sdk");
console.log("🧪 TOKEN:", process.env.CHANNEL_ACCESS_TOKEN);
console.log("🧪 SECRET:", process.env.CHANNEL_SECRET);
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
const client = new Client(config);

//app.use(express.json());
app.post("/webhook", middleware(config), (req, res) => {
  console.log("收到 webhook：", JSON.stringify(req.body, null, 2));
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(" webhook 發生錯誤：", err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  console.log("收到事件：", JSON.stringify(event, null, 2));

  // 避免回覆測試事件
  if (
    !event.replyToken ||
    event.replyToken === "00000000000000000000000000000000"
  ) {
    return Promise.resolve(null);
  }

  // ✅ 傳送「定位」查附近餐廳
  if (event.message.type === "location") {
    const lat = event.message.latitude;
    const lng = event.message.longitude;
    const apiKey = process.env.GOOGLE_PLACE_API_KEY;

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1000&type=restaurant&language=zh-TW&key=${apiKey}`;

    try {
      const response = await axios.get(url);
      const places = response.data.results;

      if (!places || places.length === 0) {
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "附近找不到餐廳 😢",
        });
      }

      const topResults = places.slice(0, 8);
      const bubbles = topResults.map((place) => {
        const name = place.name;
        const address = place.vicinity;
        const photoRef = place.photos?.[0]?.photo_reference;
        const photoUrl = photoRef
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${apiKey}`
          : "https://i.imgur.com/0W9cLrn.jpeg"; // 沒圖用預設圖

        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          name + " " + address
        )}`;

        return {
          type: "bubble",
          hero: {
            type: "image",
            url: photoUrl,
            size: "full",
            aspectRatio: "20:13",
            aspectMode: "cover",
            action: {
              type: "uri",
              uri: mapsUrl,
            },
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: name,
                weight: "bold",
                size: "md",
                wrap: true,
              },
              {
                type: "text",
                text: address,
                size: "sm",
                color: "#666666",
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
                style: "link",
                height: "sm",
                action: {
                  type: "uri",
                  label: "開啟地圖",
                  uri: mapsUrl,
                },
              },
            ],
            flex: 0,
          },
        };
      });

      return client.replyMessage(event.replyToken, {
        type: "flex",
        altText: "附近餐廳推薦",
        contents: {
          type: "carousel",
          contents: bubbles,
        },
      });
    } catch (error) {
      console.error("🔴 查詢 Google Place 餐廳錯誤：", error);
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "無法查詢附近餐廳，請稍後再試。",
      });
    }
  }

  // ✅ 關鍵字文字訊息處理
  if (event.type !== "message" || event.message.type !== "text") {
    console.log("非文字訊息，略過");
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim().toLowerCase();
  let reply = "我不知道什麼是 " + event.message.text;

  if (userText.includes("豆花")) {
    return client.replyMessage(event.replyToken, {
      type: "image",
      originalContentUrl: "https://i.imgur.com/0W9cLrn.jpeg",
      previewImageUrl: "https://i.imgur.com/0W9cLrn.jpeg",
    });
  } else if (userText.includes("天氣")) {
    reply = "今天台中天氣28度！記得防曬☀️";
  } else if (userText === "你好") {
    reply = "你好呀，我是慈昀的小助理 🤖";
  } else if (userText.includes("早安")) {
    reply = "早安呀 ☀️ 記得吃早餐！";
  } else if (userText.includes("晚安")) {
    reply = "晚安呀 🌙 祝你有個好夢";
  }

  try {
    await client.replyMessage(event.replyToken, {
      type: "text",
      text: reply,
    });
    console.log("成功回覆使用者");
  } catch (error) {
    console.error("回覆訊息失敗：", error);
    return Promise.reject(error);
  }

  return Promise.resolve(null);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Bot 已啟動在 port ${port}`);
});
