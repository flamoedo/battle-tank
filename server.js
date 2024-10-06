const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const path = require('path');
const app = express();
const server = http.createServer(app);

const io = socketIO(server, {
  
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
  
});


const port = process.env.PORT || 3000;


// Estado inicial dos tanques
let tanks = {};

io.on('connection', (socket) => {
  console.log('Novo jogador conectado:', socket.id);

  socket.on('start', () => {
  if (!tanks[socket.id]) { // Inicializa apenas se não existir
    tanks[socket.id] = {
      x: Math.random() * 500,
      y: Math.random() * 500,
      angle: 0,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      health: 100,
      id: socket.id
    };
  }

  // Envia o estado inicial do jogador e dos outros tanques
  socket.emit('initialize', { tanks });

  // Envia o novo tanque para todos os outros jogadores
  //socket.broadcast.emit('newPlayer', { id: socket.id, tank: tanks[socket.id] });
  });
  
  // Movimentação do tanque
	  socket.on('move', (data) => {
		if (tanks[socket.id]) {
			// Atualiza apenas os atributos de `data`, mantendo o restante
			tanks[socket.id] = { 
				...tanks[socket.id], 
				x: data.x || tanks[socket.id].x, 
				y: data.y || tanks[socket.id].y, 
				angle: data.angle || tanks[socket.id].angle 
			};
			io.emit('tankMoved', { id: socket.id, tank: tanks[socket.id] });
		}
	});

  // Atirar
  socket.on('shoot', (bullet) => {
    io.emit('bulletFired', { id: socket.id, bullet });
  });

  // Colisão e dano
	socket.on('hit', (id) => {
		if (tanks[id]) {
		  // Verifica se o valor de health é um número válido antes de alterar
		  if (typeof tanks[id].health === 'number') {
			  
			health = tanks[id].health
			health -= 20;
			tanks[id].health = health;
			console.log('atingido ' + id + ' - ' + tanks[id].health);

			// Destrói o tanque quando a saúde é zero ou menos
			if (tanks[id].health <= 0) {
			  io.emit('destroyed', { id });
			  delete tanks[id];
			  console.log('destruido ' + id);
			} else {
			  // Apenas emite o evento de saúde atualizada, se necessário
			  io.emit('damaged', { id, health: tanks[id].health });
			}
		  } else {
			console.error('Health inválido para o tanque ' + id);
		  }
		}
	  });



  socket.on('disconnect', () => {
    console.log('Jogador desconectado:', socket.id);
    delete tanks[socket.id];
    io.emit('playerDisconnected', { id: socket.id });
  });
});


// Serve o arquivo tank.html quando a raiz é acessada
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'tank.html'));
});

app.use('/favicon.ico', express.static('favicon.ico'));


server.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`)
})

