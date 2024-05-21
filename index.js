const express = require("express");
const CookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectDB } = require("./configs/connectDBConfig.config");
const userRoute = require("./routes/user.routes");
const authRoute = require("./routes/auth.routes");
const groupRoute = require("./routes/group.routes");
const { app, server } = require("./socket/socket.io");
const authMiddleware = require("./middlewares/authMiddleware");
const chatRouter = require("./routes/chat.routes");
const conversationRouter = require("./routes/conversation.routes");

const bodyParser = require("body-parser");

// Sử dụng body-parser middleware để xử lý dữ liệu form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

dotenv.config();
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use(CookieParser());
app.use(express.static("public"));

//connect DB
connectDB();

app.get("/api/terms_of_service", (req, res) => {
  res.sendFile(__dirname + "/public/resources/terms_of_services.html");
});
//routes
app.use("/api/users", userRoute);
app.use("/api/auth", authRoute);
app.use("/api/groups", groupRoute);
app.use("/api/chats", authMiddleware.protect, chatRouter);
app.use("/api/conversations", authMiddleware.protect, conversationRouter);

server.listen(process.env.PORT, () => {
  const os = require("os");
  const ifaces = os.networkInterfaces();
  let ipAddress = "";
  Object.keys(ifaces).forEach(function (ifname) {
    let alias = 0;
    ifaces[ifname].forEach(function (iface) {
      if ("IPv4" !== iface.family || iface.internal !== false) {
        return;
      }
      if (alias >= 1) {
        ipAddress = iface.address;
      } else {
        ipAddress = iface.address;
      }
      ++alias;
    });
  });
  console.log(`Server is running on ${ipAddress}:${process.env.PORT}`);
});
