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
  // ✅ 查詢位置訊息 → Google Place API 查餐廳
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

      const topResults = places.slice(0, 5); // 顯示前5筆
      const formatted = topResults
        .map((place, i) => `${i + 1}. ${place.name}（${place.vicinity}）`)
        .join("\n");

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: `📍 附近餐廳推薦：\n${formatted}`,
      });
    } catch (error) {
      console.error("🔴 Google Place API 查詢失敗：", error.message);
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "查詢附近餐廳時發生錯誤，請稍後再試 🙏",
      });
    }
  }
  if (event.type !== "message" || event.message.type !== "text") {
    console.log("非文字訊息，略過");
    return Promise.resolve(null);
  }

  if (
    !event.replyToken ||
    event.replyToken === "00000000000000000000000000000000"
  ) {
    console.log(" 測試事件，略過回覆");
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim().toLowerCase(); // 使用者輸入轉小寫

  let reply = "我不知道什麼是" + event.message.text;

  // 關鍵字判斷邏輯
  if (userText.includes("豆花")) {
    return client.replyMessage(event.replyToken, {
      type: "image",
      originalContentUrl: "https://i.imgur.com/0W9cLrn.jpeg",
      previewImageUrl: "https://i.imgur.com/0W9cLrn.jpeg",
    });
  } else if (userText.includes("天氣")) {
    reply = "今天台中天氣28度!記得防曬";
  } else if (userText === "你好") {
    reply = "你好呀我是慈昀的小助理";
  } else if (userText.includes("早安")) {
    reply = "早安呀 記得吃早餐";
  } else if (userText.includes("晚安")) {
    reply = "晚安呀 我也要睡囉 祝好夢";
  }

  try {
    await client.replyMessage(event.replyToken, {
      type: "text",
      text: reply, //上面的
    });
    console.log("成功回覆使用者");
  } catch (error) {
    console.error(" 回覆訊息失敗：", error);
    return Promise.reject(error);
  }

  return Promise.resolve(null);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Bot 已啟動在 port ${port}`);
});
