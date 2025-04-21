const express = require("express");
const { Client, middleware } = require("@line/bot-sdk");
console.log("🧪 TOKEN:", process.env.CHANNEL_ACCESS_TOKEN);
console.log("🧪 SECRET:", process.env.CHANNEL_SECRET);
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
const client = new Client(config);

// ✅ 加 log 檢查是否真的進來

//app.use(express.json());
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

  if (event.type !== "message" || event.message.type !== "text") {
    console.log("🔕 非文字訊息，略過");
    return Promise.resolve(null);
  }

  if (
    !event.replyToken ||
    event.replyToken === "00000000000000000000000000000000"
  ) {
    console.log("🟡 測試事件，略過回覆");
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim().toLowerCase(); // 使用者輸入轉小寫

  let reply = "我不知道什麼是：" + event.message.text;

  // ✅ 加入關鍵字判斷邏輯
  if (userText.includes("慈昀")) {
    return client.replyMessage(event.replyToken, {
      type: "image",
      originalContentUrl: "https://i.imgur.com/0W9cLrn.jpeg", // 👈 換成你要的圖片網址
      previewImageUrl: "https://i.imgur.com/0W9cLrn.jpeg",
    });
  } else if (userText.includes("文新")) {
    reply = "黃聖淮那麼爛怎麼不分手!!!!!!!!!!!!!!!";
  } else if (userText === "淳瑋") {
    reply =
      "對不起讓你難過了，是我不應該沒有拿捏好分寸這樣讓你有這些煩惱，但我真的是把你當好朋友看待，我沒有要玩弄你感情的意思，是我自己太愛玩了，所以才會這樣曖昧不明，但我真心覺得你比那兩個人好，我會這樣說是為了不想要讓你對我有好感，剛上大學我真的玩瘋了，對很多事都無所謂，所以才會造成這樣的結果，我真的希望你找都屬於自己的幸福，不要把我這個爛人看得太重，如果可以，我真的希望還是能跟你當朋友，就算要一段時間也沒關係，希望最後還是能當朋友，如果你真的覺得不行的話也沒關係，我可以體諒的，對不起還有 謝謝你，真的很謝謝你";
  } else if (userText.includes("幹")) {
    reply = "我操你媽";
  } else if (userText.includes("羽宣")) {
    reply =
      "我覺得昨天當時妳的態度已經讓我覺得我確定要結束這個關係了，我們真的有很多好的、開心的回憶，但每次吵架或不開心的時候，總是沒辦法好好解決，我也是吵架也都是先冷靜的那種，但我也不會兇妳，或者是說話很難聽，我之前都覺得沒關係態度先放軟就好了，哄一下就好了，可是這兩天的事情讓我真的開始想說是不是我們不適合，我們也有磨合過，我也珍惜過這段感情，我也很難過，但我想到如果之後，真的到了我們所規劃的那些後，我們又這樣吵架呢！所以我才覺得在這個時候離開，也許未來即使不是交往的關係，我也希望妳可以好好的，平安就好，後續我也不會再回訊息了，希望這段時間可以讓我們都好好沈澱一下，謝謝妳這段時間的相處，祝妳未來順利";
  } else if (userText.includes("鐶鐶")) {
    reply =
      "妳給的回憶很美深深的刻在我的腦海我不会忘记這些日子裡讓妳委屈了對不妳很好,只是有時很固執以後的日子我不在了好好照顧自己的身體不舒服就去看醫生,乖乖吃藥三餐要記得吃,別不吃飯天氣冷記得多穿外套別著涼了沒想過會走到這一天我真的感覺很難過痛苦眼淚不爭氣的一直掉了下來我試著止住,可是我控制不了對不起,我愛妳";
  } else if (userText.includes("彥龍")) {
    reply = "超級可愛><";
  } else if (userText.includes("立洋")) {
    reply = "香蕉新樂園超好玩";
  } else if (userText.includes("晏汝")) {
    reply = "死T";
  } else if (userText.includes("宗育")) {
    reply = "死GAY";
  } else if (userText.includes("嘉男")) {
    reply = "很醜不太好看";
  }

  try {
    await client.replyMessage(event.replyToken, {
      type: "text",
      text: reply, //上面的
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
