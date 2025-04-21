const express = require("express");
const { Client, middleware } = require("@line/bot-sdk");

const config = {
  channelAccessToken: "process.env.CHANNEL_ACCESS_TOKEN",
  channelSecret: "process.env.CHANNEL_SECRET",
};

const app = express();
const client = new Client(config);

// ✅ 加 log 檢查是否真的進來
app.post("/webhook", middleware(config), (req, res) => {
  console.log("✅ 收到 LINE Webhook：", JSON.stringify(req.body, null, 2));
  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
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

app.listen(3000, () => {
  console.log("🚀 Bot 已啟動在 http://localhost:3000");
});
