const fs = require("fs");
const { Client } = require("@line/bot-sdk");
require("dotenv").config();

const client = new Client({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
});

async function setupRichMenu() {
  const richMenu = {
    size: { width: 2500, height: 1686 }, // 高度改為 1686
    selected: true,
    name: "主選單",
    chatBarText: "請選擇查詢類型",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: "message", text: "餐廳" },
      },
      {
        bounds: { x: 834, y: 0, width: 833, height: 843 },
        action: { type: "message", text: "超商" },
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: "message", text: "加油站" },
      },

      // 第二排
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: "message", text: "景點" },
      },
      {
        bounds: { x: 834, y: 843, width: 833, height: 843 },
        action: { type: "message", text: "藥局" },
      },
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: "message", text: "天氣" },
      },
    ],
  };
  //測試
  try {
    const richMenuId = await client.createRichMenu(richMenu);
    console.log("✅ Rich Menu created:", richMenuId);

    const imageBuffer = fs.readFileSync("menu.png");
    await client.setRichMenuImage(richMenuId, imageBuffer, "image/png");

    await client.setDefaultRichMenu(richMenuId);
    console.log("✅ 已設定為預設 Rich Menu！");
  } catch (error) {
    console.error("❌ 建立失敗：", error);
  }
}

setupRichMenu();
