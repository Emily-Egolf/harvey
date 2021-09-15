const Discord = require('discord.js');
const { PREFIX, TOKEN } = require('./config.json');
const ytdl = require('ytdl-core');

const client = new Discord.Client();
client.login(TOKEN);

client.once('ready', () => console.log('Ready!'));
client.once('reconnecting', () => console.log('Reconnecting!'));
client.once('disconnect', () => console.log('Disconnect!'));

let currentDispatcher;
let currentSong;
let songQueue = [];
const botCommands = {
	play: (message, [url, seek], top) => {
		const vc = message.member.voice.channel;
		if (!vc) return 'You must be in a voice channel to play music';
		let addSong = top ? [].unshift : [].push;
		ytdl.getInfo(url)
			.then(info => {
				addSong.apply(songQueue, [{
					title: info.videoDetails.title,
					url: info.videoDetails.video_url,
					seek}]);
				if (!currentDispatcher) startDispatcher(vc, message.channel, playNext)
				else message.channel.send(`**${songQueue.at(-1).title}** added to the queue`)})
			.catch(err => {
				message.channel.send(`harvey don't want to play songs no more`);
				console.error(err);
				songQueue = []})},
	skip: () => {if (currentDispatcher) currentDispatcher.end()},
	stop: () => clearSongState(),
	skipto: (_, [n]) => {if (currentDispatcher) {songQueue = songQueue.slice(n-1); currentDispatcher.end()}},
	queue: (message) => message.channel
		.send(songQueue[0] ? songQueue
			.map((s,i) => `${i+1}. **${s.title}**`)
			.reduce((a,l) => a+'\n'+l) : `Harvey has nothing left to play`),
	playtop: (message, args) => botCommands.play(message, args, 1),
	seek: (message, [seek]) => {
		const vc = message.member.voice.channel;
		if (!vc) return 'You must be in a voice channel to play music';
		if (currentDispatcher && currentSong && seek) {
			currentSong.seek = seek;
			startDispatcher(vc, message.channel, playCurrentSong)}},
	help: (message) => message.channel.send(
`The current command prefix is: **${PREFIX}**
play,p [url]: Add a song to the queue
skip,s: Skip the current song
stop,S: End the queue and current song
skipto,st [n]: Skip to the nth song in the queue
queue,q: print the current queue
playtop,pt: Add a song to the front of the queue
seek,se [time]: Seek to a time hh:mm:ss
help,h: Print this message`)};

const clearSongState = () => {
	songQueue = [];
	currentSong = null;
	if (currentDispatcher) {
		currentDispatcher.end();
	}
	currentDispatcher = null;
};

const timestampToS = (seek, seekMult=[1, 60, 60**2]) =>
	(typeof seek === 'string') ?
		seek.split(':').slice(-3).reverse()
			.reduce((a,v,i) => a+(v*seekMult[i]),0) :
		0;

const playCurrentSong = (conn, tc) => {
	const seek = timestampToS(currentSong.seek);
	currentDispatcher = conn.play(ytdl(currentSong.url), { seek })
		.on('finish', () => playNext(conn, tc))
		.on('error', console.error);
	tc.send(`Now playing: **${currentSong.title}**${seek ? ` at **${currentSong.seek}**` : ''}`);
};

const playNext = (conn, tc) => {
	if (!songQueue.length) return currentDispatcher = conn.disconnect();
	currentSong = songQueue.shift();
	playCurrentSong(conn, tc);
};

const startDispatcher = (vc, tc, onConnected) =>
	vc.join()
		.then(conn => onConnected(conn, tc))
		.catch(err => {
			tc.send(`Harvey can't be found at the moment, but we'll find him soon enough`);
			console.error(err);
			clearSongState();
		});

client.on('message', async message => {
	if (message.author.bot) return;
	if (!message.content.startsWith(PREFIX)) return;
	let command = message.content.slice(1).split(' ');
	const aliases = {
		p: 'play',
		s: 'skip',
		S: 'stop',
		st: 'skipto',
		q: 'queue',
		pt: 'playtop',
		h: 'help'};
	command[0] = aliases[command[0]] || command[0];
	let f = botCommands[command[0]];
	if (f) f(message, command.slice(1))
	else message.channel.send(`Invalid command. Use \`${PREFIX}h\` to see a list of commands`)});


