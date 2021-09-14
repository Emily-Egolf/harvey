const Discord = require('discord.js');
const { PREFIX, TOKEN } = {
	"PREFIX": "$",
	"TOKEN": "ODg3Mzk3MzU4MjAyMTI2Mzk3.YUDjMQ.oDGWA6i-lbZ7pz6zKOscmmEXf3g"
};
const ytdl = require('ytdl-core');

const client = new Discord.Client();
client.login(TOKEN);

client.once('ready', () => console.log('Ready!'));
client.once('reconnecting', () => console.log('Reconnecting!'));
client.once('disconnect', () => console.log('Disconnect!'));

let currentDispatcher;
let songQueue = [];
const botCommands = {
	play: (message, [url], top) => {
		const vc = message.member.voice.channel;
		if (!vc) return 'You must be in a voice channel to play music';
		let addSong = top ? [].unshift : [].push;
		ytdl.getInfo(url)
			.then(info => {
				addSong.apply(songQueue, [{
					title: info.videoDetails.title,
					url: info.videoDetails.video_url}]);
				if (!currentDispatcher) startDispatcher(vc, message.channel)
				else message.channel.send(`**${songQueue.at(-1).title}** added to the queue`)})},
	skip: () => currentDispatcher.end(),
	stop: () => (songQueue = [], currentDispatcher.end()),
	skipto: (_, [n]) => (songQueue = songQueue.slice(n-1), currentDispatcher.end()),
	queue: (message) => message.channel
		.send(songQueue[0] ? songQueue
			.map((s,i) => `${i+1}. **${s.title}**`)
			.reduce((a,l) => a+'\n'+l) : `Harvey has nothing left to play`),
	playtop: (message, args) => botCommands.play(message, args, 1),
	help: (message) => message.channel.send(
`The current command prefix is: **${PREFIX}**
play,p [url]: Add a song to the queue
skip,s: Skip the current song
stop,S: End the queue and current song
skipto,st [n]: Skip to the nth song in the queue
queue,q: print the current queue
playtop,pt: Add a song to the front of the queue
help,h: Print this message`)};

const playNext = (conn, tc) => {
	if (!songQueue.length) return currentDispatcher = conn.disconnect();
	let song = songQueue.shift();
	currentDispatcher = conn.play(ytdl(song.url))
		.on('finish', () => playNext(conn, tc))
		.on('error', console.error);
	tc.send(`Now playing: **${song.title}**`)};

const startDispatcher = (vc, tc) =>
	vc.join()
		.then(conn => playNext(conn, tc))
		.catch(err => {
			tc.send(`Harvey can't be found at the moment, but we'll find him soon enough`);
			console.error(err);
			songQueue = []});

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


