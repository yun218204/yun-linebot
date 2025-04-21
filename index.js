const express = require("express");
const { Client, middleware } = require("@line/bot-sdk");

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
console.log("🧪 TOKEN:", process.env.CHANNEL_ACCESS_TOKEN);
console.log("🧪 SECRET:", process.env.CHANNEL_SECRET);

const app = express();
const client = new Client(config);

// ✅ 加 log 檢查是否真的進來

app.use(express.json());
app.post("/webhook", middleware(config), (req, res) => {
  console.log("✅ 收到 webhook：", JSON.stringify(req.body, null, 2));
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error("❌ webhook 發生錯誤：", err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  console.log("📩 收到事件：", JSON.stringify(event, null, 2));

  // 檢查是否為文字訊息，否則略過
  if (event.type !== "message" || event.message.type !== "text") {
    console.log("🔕 非文字訊息，略過");
    return Promise.resolve(null);
  }

  // 檢查是否有 replyToken
  if (
    !event.replyToken ||
    event.replyToken === "00000000000000000000000000000000"
  ) {
    console.log("🟡 測試事件，略過回覆");
    return Promise.resolve(null);
  }

  // 回覆訊息
  try {
    await client.replyMessage(event.replyToken, {
      type: "text",
      text: `你說了：${event.message.text}`,
    });
    console.log("✅ 成功回覆使用者");
  } catch (error) {
    console.error("❌ 回覆訊息失敗：", error);
    return Promise.reject(error);
  }

  return Promise.resolve(null);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Bot 已啟動在 port ${port}`);
});
