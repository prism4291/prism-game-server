const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { Client } = require("pg");
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});
const query = {
      text: "CREATE TABLE member (username text,password text)",
    };
    client.connect();
    client
      .query(query)
      .then((res) => {
        console.log(res.rows[0]);
        dbPass=res.rows[0];
        client.end();
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
  socket.on('sendMessage', (message) => {
    console.log('Message has been sent: ', message);

    // 'receiveMessage' というイベントを発火、受信したメッセージを全てのクライアントに対して送信する
    io.emit('receiveMessage', message);
  });
  socket.on('clientLogin', (message) => {
    console.log('clientLogin: ', message);
    var userData = JSON.parse(message);
    var dbPass=null;
    var query = {
      text: "SELECT password FROM member WHERE username = $1",
      values: [userData["username"]],
    };
    client.connect();
    client
      .query(query)
      .then((res) => {
        console.log(res.rows[0]);
        dbPass=res.rows[0];
        client.end();
      })
      .catch((e) => console.error(e.stack));
    if(dbPass==null){
      var query = {
        text: "INSERT INTO member VALUES ($1,$2)",
        values: [userData["username"],userData["password"]],
      };
      client.connect();
      client
        .query(query)
        .then((res) => {
          console.log(res.rows[0]);
          dbPass=res.rows[0];
          client.end();
        })
        .catch((e) => console.error(e.stack));
    }else if(dbPass==userData["password"]){
        io.to(socket.id).emit('serverVerifyLogin',socket.id);
    }
  });
});
