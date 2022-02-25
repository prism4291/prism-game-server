const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { Client } = require("pg");
const conn = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    sslmode:'require',
    rejectUnauthorized:false
  }
});
conn.connect((err) => {
  //エラー時の処理
  if(err){
      console.log('error connecting:' + err.stack);
      return;
  }
  //接続成功時の処理
  console.log('success');
});

const query = {
  text: "DELETE FROM member",
};
awit conn
  .query(query)
  .then((res) => {
    console.log(res.rows[0]);
    dbPass=res.rows[0];
  })
  .catch((e) => console.error(e.stack));

const app = express();
const server = http.Server(app);
const io = socketIo(server);

const PORT = process.env.PORT || 5000

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

server.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});

io.on('connection', (socket) => {
  console.log('user connected');
  socket.on('clientLogin', (message) => {
    console.log('clientLogin: ', message);
    var userData = JSON.parse(message);
    var dbPass=null;
    var query = {
      text: "SELECT password FROM member WHERE username = $1",
      values: [userData["username"]],
    };
    await conn
      .query(query)
      .then((res) => {
        dbPass=res.rows[0];
        console.log("dbPass 2 ->");
        console.log(dbPass);
      })
      .catch((e) => console.error(e.stack));
    console.log("dbPass->");
    console.log(dbPass);
    if(dbPass==null){
      var query = {
        text: "INSERT INTO member VALUES ($1,$2)",
        values: [userData["username"],userData["password"]],
      };
      await conn
        .query(query)
        .then((res) => {
          io.to(socket.id).emit('serverVerifyLogin',socket.id);
        })
        .catch((e) => console.error(e.stack));
    }else if(dbPass==userData["password"]){
        io.to(socket.id).emit('serverVerifyLogin',socket.id);
    }
    console.log(dbPass+","+userData["password"]);
  });
});
