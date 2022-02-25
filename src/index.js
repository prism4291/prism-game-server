const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
var { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});


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
    try {
      const pgclient = pool.connect();
      await pgclient.query('CREATE TABLE member (username text,password text);');
      const pgresult = await pgclient.query('SELECT * FROM member');
      const pgresults = { 'results': (pgresult) ? pgresult.rows : null};
      console.log(pgresults);
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
    io.to(socket.id).emit('serverVerifyLogin',socket.id);
  });
});
