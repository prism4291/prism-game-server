const clientVersion=1;
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
/*
conn
  .query({
    text: "DELETE FROM member",
  })
  .then((res) => {
    console.log(res.rows[0]);
    dbPass=res.rows[0];
  })
  .catch((e) => console.error(e.stack));
*/

var socketList=[];
var socketToName={};
var socketToRoom={};

var roomList=[];
var roomDict={};
var roomNum=1;

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
  socket.on('disconnect',(message) => {
    if(socketList.includes(socket.id)){
      console.log("disconnect ",socket.id,socketToName[socket.id]);
      for(var i=0;i<roomList.length;i++){
        if(roomDict[roomList[i]]["host"]==socketToName[socket.id]){
          roomDict[roomList[i]]["active"]="false";
        }
      }
      io.to(socketToRoom[socket.id]).emit('serverDisconnect',message);
    }else{
      console.log("idk socket ",socket.id,socketToName[socket.id]);
    }
  });
  socket.on('clientRoomMessage',(message) => {
    if(socketList.includes(socket.id)){
    io.to(socketToRoom[socket.id]).emit('serverRoomMessage',message);
    }else{
      console.log("idk socket ",socket.id,socketToName[socket.id]);
    }
  });
  socket.on('clientReStartGame',(message) => {
    if(socketList.includes(socket.id)){
    io.to(socketToRoom[socket.id]).emit('serverReStartGame',message);
    }else{
      console.log("idk socket ",socket.id,socketToName[socket.id]);
    }
  });
  socket.on('clientCreateRoom', (message) => {
    if(socketList.includes(socket.id)){
    roomNum+=Math.floor( Math.random() * 100 +1);
    var roomName="room"+roomNum;
    socketToRoom[socket.id]=roomName;
    socket.join(roomName);
    roomList.push(roomName);
    roomDict[roomName]={active:true,name:roomName,host:socketToName[socket.id],guest:[]};
    io.to(socket.id).emit('serverCreateRoomRes',{name:roomName,room:roomDict[roomName]});
    }else{
      console.log("idk socket ",socket.id,socketToName[socket.id]);
    }
  });
  socket.on('clientStartGame', (message) => {
    if(socketList.includes(socket.id)){
    var userData = JSON.parse(message);
    var joiningRoom=userData["name"];
    io.to(joiningRoom).emit('serverStartGame',{status:"start"});
      console.log("startGame",socket.id,socketToName[socket.id]);
    }else{
      console.log("idk socket ",socket.id,socketToName[socket.id]);
    }
  });
  socket.on('clientGetRoom', (message) => {
    if(socketList.includes(socket.id)){
    var resRooms=[];
    for(var i=0;i<roomList.length;i++){
      if(roomDict[roomList[i]]["active"]==true){
        resRooms.push(roomDict[roomList[i]]);
      }
    }
    io.to(socket.id).emit('serverGetRoomRes',{rooms:resRooms});
    }else{
      console.log("idk socket ",socket.id,socketToName[socket.id]);
    }
  });
  socket.on('clientJoinRoom', (message) => {
    if(socketList.includes(socket.id)){
    var userData = JSON.parse(message);
    var joiningRoom=userData["room"];
    if(roomDict[joiningRoom]==null){
      io.to(socket.id).emit('serverJoinRoomRes',{status:"notfound"});
    }else if(roomDict[joiningRoom]["active"]==false){
      io.to(socket.id).emit('serverJoinRoomRes',{status:"closed"});
    }else if(roomDict[joiningRoom]["active"]==true){
      socket.join(joiningRoom);
      socketToRoom[socket.id]=joiningRoom;
      roomDict[joiningRoom]["active"]=false;
      roomDict[joiningRoom]["guest"].push(socketToName[socket.id]);
      io.to(socket.id).emit('serverJoinRoomRes',{status:"success",room:roomDict[joiningRoom]});
      io.to(joiningRoom).emit('serverJoinMember',{name:socketToName[socket.id],room:roomDict[joiningRoom]});
      
    }
    }
  });
  socket.on('clientLogin', (message) => {
    console.log('clientLogin: ', message,socket.id);
    var userData = JSON.parse(message);
    //console.log("json ",userData,userData["username"],userData.username);
    if(userData["version"]!=clientVersion){
      io.to(socket.id).emit('serverVerifyLogin',{status:"fail",socketid:""});
    }else{  
    socketToName[socket.id]=userData["username"];
    conn
      .query({
        text: "SELECT * FROM member WHERE username = $1",
        values: [userData["username"]],
      })
      .then((res) => {
        dbData=res.rows[0];
        //console.log("dbData 2 ->",res);
        //console.log(dbData);
        if(dbData==null){
          conn
            .query({
              text: "INSERT INTO member VALUES ($1,$2)",
              values: [userData["username"],userData["password"]],
            })
            .then((res) => {
              io.to(socket.id).emit('serverVerifyLogin',{status:"new",socketid:socket.id});
              socketList.push(socket.id);
            })
            .catch((e) => console.error(e.stack));
        }else if(dbData["password"]==userData["password"]){
          io.to(socket.id).emit('serverVerifyLogin',{status:"match",socketid:socket.id});
          socketList.push(socket.id);
        }else{
          io.to(socket.id).emit('serverVerifyLogin',{status:"fail",socketid:""});
        }
      })
      .catch((e) => console.error(e.stack));
    }
  });
});
