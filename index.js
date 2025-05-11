const express = require("express");
const { Client, middleware } = require("@line/bot-sdk");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

// ✅ 必須先定義 config 才能用
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
const client = new Client(config);

// ✅ middleware 放這裡就好，不要放 use，全交給 webhook 路由處理
app.post("/webhook", middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map((event) => handleEvent(event)));
  res.json(results);
});

const userCategoryMap = {}; // 暫存查詢類型

async function handleEvent(event) {
  const userId = event.source.userId;

  if (event.type === "message" && event.message.type === "text") {
    const userText = event.message.text;

    if (userText === "餐廳") {
      userCategoryMap[userId] = ["restaurant", "cafe"];
      return replyLocationPrompt(event.replyToken, "餐廳（含飲料店）");
    }
    if (userText === "超商") {
      userCategoryMap[userId] = "convenience_store";
      return replyLocationPrompt(event.replyToken, "超商");
    }
    if (userText === "加油站") {
      userCategoryMap[userId] = "gas_station";
      return replyLocationPrompt(event.replyToken, "加油站");
    }
    if (userText === "景點") {
      userCategoryMap[userId] = "tourist_attraction";
      return replyLocationPrompt(event.replyToken, "景點");
    }
    if (userText === "藥局") {
      userCategoryMap[userId] = "pharmacy";
      return replyLocationPrompt(event.replyToken, "藥局");
    }
    if (userText === "天氣") {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "天氣功能尚未啟用 ☁️⛅",
      });
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "請使用主選單查詢 🧭",
    });
  }

  if (event.type === "message" && event.message.type === "location") {
    const { latitude, longitude } = event.message;
    const category = userCategoryMap[userId];
    if (!category) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請先透過主選單選擇查詢類型 🙏",
      });
    }

    const types = Array.isArray(category) ? category : [category];
    let allPlaces = [];

    for (const type of types) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=1500&type=${type}&language=zh-TW&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const response = await axios.get(url);
      allPlaces.push(...(response.data.results || []));
    }

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

    const reply = places
      .slice(0, 5)
      .map((place, idx) => {
        const name = place.name;
        const address = place.vicinity || "";
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          name
        )}`;
        return `${idx + 1}. ${name}\n${address}\n${mapUrl}`;
      })
      .join("\n\n");

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: reply,
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
  console.log(`Server running on port ${PORT}`);
});
