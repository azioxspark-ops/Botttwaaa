const express = require("express");
const mineflayer = require("mineflayer");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const mcDataLoader = require("minecraft-data");

const app = express();
const PORT = process.env.PORT || 3000;

// Keep Railway service alive
app.get("/", (req, res) => res.send("Minecraft Bot Running"));
app.listen(PORT, "0.0.0.0", () => {
  console.log("Web server running on port " + PORT);
});

let bot;
let jumpInterval;

function createBot() {
  console.log("Starting bot...");

  bot = mineflayer.createBot({
    host: "Season_four.aternos.me",
    port: 32675,
    username: "chatpata_bhaaluu",
    version: "1.21.11"
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let guardPos = null;
  const mcData = mcDataLoader(bot.version);

  bot.once("spawn", () => {
    console.log("Bot joined server");

    // Try login after join
    setTimeout(() => {
      bot.chat("/login botwa123123");
    }, 3000);

    // Anti AFK
    jumpInterval = setInterval(() => {
      if (!bot?.entity) return;

      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 120);

    }, 10000);
  });

  // Detect register/login messages
  bot.on("message", (msg) => {
    const text = msg.toString().toLowerCase();

    if (text.includes("register")) {
      setTimeout(() => {
        bot.chat("/register botwa123123 botwa123123");
      }, 1000);
    }

    if (text.includes("login")) {
      setTimeout(() => {
       bot.chat("/login botwa123123");
     }, 1000);
    }
  });

  // Auto equip sword and shield
  bot.on("playerCollect", (collector) => {
    if (collector !== bot.entity) return;

    setTimeout(() => {
      const sword = bot.inventory.items().find(i => i.name.includes("sword"));
      if (sword) bot.equip(sword, "hand").catch(() => {});

      const shield = bot.inventory.items().find(i => i.name.includes("shield"));
      if (shield) bot.equip(shield, "off-hand").catch(() => {});
    }, 300);
  });

  function guardArea(pos) {
    guardPos = pos.clone();
    if (!bot.pvp.target) moveToGuardPos();
  }

  function stopGuarding() {
    guardPos = null;
    bot.pvp.stop();
    bot.pathfinder.setGoal(null);
  }

  function moveToGuardPos() {
    if (!guardPos) return;

    const movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements);

    bot.pathfinder.setGoal(
      new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z)
    );
  }

  bot.on("stoppedAttacking", () => {
    if (guardPos) moveToGuardPos();
  });

  // AI loop
  bot.on("physicsTick", () => {
    if (!bot?.entity) return;

    if (!bot.pvp.target && !bot.pathfinder.isMoving()) {
      const entity = bot.nearestEntity();
      if (entity) {
        bot.lookAt(entity.position.offset(0, entity.height, 0), true).catch(() => {});
      }
    }

    if (guardPos) {
      const mob = bot.nearestEntity(e =>
        e.type === "mob" &&
        e.mobType !== "Armor Stand" &&
        e.position.distanceTo(bot.entity.position) < 16
      );

      if (mob) bot.pvp.attack(mob);
    }
  });

  // Chat commands
  bot.on("chat", (username, message) => {
    if (username === bot.username) return;

    if (message === "guard") {
      const player = bot.players[username];
      if (player?.entity) {
        bot.chat("Guarding this area!");
        guardArea(player.entity.position);
      }
    }

    if (message === "stop") {
      bot.chat("Stopping guard!");
      stopGuarding();
    }
  });

  bot.on("kicked", reason => console.log("Kicked:", reason));
  bot.on("error", err => console.log("Error:", err.message));

  bot.on("end", () => {
    console.log("Bot disconnected");
    if (jumpInterval) clearInterval(jumpInterval);
  });
}

process.on("uncaughtException", err => {
  console.log("Uncaught Error:", err);
});

createBot();
                                               
