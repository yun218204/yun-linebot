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

function handleEvent(event) {
  console.log("📩 處理事件：", JSON.stringify(event, null, 2));
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: `你說了：${event.message.text}`,
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Bot 已啟動在 port ${port}`);
});
