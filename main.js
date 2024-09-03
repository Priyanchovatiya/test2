// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var bodyParser = require('body-parser');
var fs = require('graceful-fs');
var port = process.env.PORT || 3000;

// app.get('/', function (req, res) {
//   // res.send('hello world')
//   res.render('login');
// })

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname +'/views'));
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');
app.set('views','./views');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


app.get('/chat', function (req, res) {
  // res.send('hello world')
  res.render('chat');
})
app.get('/login', function (req, res) {
  // res.send('hello world')
  res.render('login');
})

app.post('/createUser',(req,res)=>{
  console.log('createUser >> ',req.body)
  var userData = req.body.userData
  var allUsers = fs.readFileSync('user.json')
  allUsers = JSON.parse(allUsers)
  if(allUsers.users) {
    console.log('data found ')
    var userExist = allUsers.users.filter(obj => { return obj.email == userData.email }).length
    if (!userExist) {
      var data = {
        un:userData.name,
        email:userData.email,
        password:userData.password,
        login:0
      }
      allUsers.users.push(data);
      console.log('all user')
      fs.writeFile('user.json', JSON.stringify(allUsers), (err) => {
        if (err) throw err;
        else {
          console.log('user has been saved!');
          // res.render('login');
          return res.status(200).json({success:1,userExist : false})      
        }
      });
    }
    else {
      console.log('user already exist.')
      return res.status(200).json({success:0,userExist : true})      
    }
  }
})

app.post('/login',(req,res)=>{
  console.log('login >> ',req.body)
  var loginData = req.body.loginData
  var allUsers = fs.readFileSync('user.json')
  allUsers = JSON.parse(allUsers)
  if(allUsers.users) {
    console.log('data found ')
    var userFoundData = allUsers.users.filter(obj => { return obj.email == loginData.email })
    if(userFoundData.length) {
      if(loginData.password == userFoundData[0].password){
        console.log('user found')
        socket.username = userFoundData[0].un;
        socket.email = userFoundData[0].email;
        var userList = allUsers.users.map(obj => {return {un:obj.un,email:obj.email}});
        console.log("userList >> ",userList)
        res.render('chat',{userList:userList});
      }
      else {
        console.log('password not match');
        return res.status(200).json({success:0,loginErrMsg : "Password is not match."})      
      }
    }
    else {
      console.log('user not found in login');
      return res.status(200).json({success:0,loginErrMsg : "Email ID is not registered."})      
    }
  }
})

// Chatroom

var numUsers = 0;

io.on('connection', (socket) => {
  console.log('socket connected')
  var addedUser = false;

  var allUsers = fs.readFileSync('user.json')
  allUsers = JSON.parse(allUsers)
  io.sockets.emit('OUC',{cnt:allUsers.users.length})

  socket.on('startChat', (data) => {
    // we tell the client to execute 'new message'
    console.log('start chat data >> ',data)
    /**
     * code for getting chat details
     */

  });

  socket.on('sendmsg', (data) => {
    // we tell the client to execute 'new message'
    var allUsers = fs.readFileSync('user.json')
    allUsers = JSON.parse(allUsers)
    var userFoundData = allUsers.users.filter(obj => { return obj.email == data.email })
    // var tsocid = userFoundData[0].sid;
    socket.emit('newmessage', {
      username: socket.username,
      message: data.msg
    });
    // io.to(tsocid).emit('newmessage', {
    //   username: socket.username,
    //   message: data.msg
    // });

    var saveChatData = {
      sun : socket.username || 'hk',
      sid : socket.email || 'hk@gmail.com',
      tun : data.tun,
      tid : data.tid,
      msg : data.msg
    }
    var allmsgs = fs.readFileSync('chat.json')
    allmsgs = JSON.parse(allmsgs);
    if(allmsgs.messages) {
      allmsgs.messages.push(saveChatData);
      fs.writeFile('chat.json', JSON.stringify(allmsgs), (err) => {
        if (err) throw err;
        else {
          console.log('msg has been saved!');
        }
      });
    }
  });

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data.msg
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (username) => {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});