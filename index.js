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

let currentDispatcher = {};
const songQueue = [];
const botCommands = {
	play: (message, [url]) => {
		const vc = message.member.voice.channel;
		if (!vc) return 'You must be in a voice channel to play music';
		ytdl.getInfo(url)
			.then(info => {
				songQueue.push({
					title: info.videoDetails.title,
					url: info.videoDetails.video_url});
				if (songQueue.length == 1) startDispatcher(vc, message.channel)
				else message.channel.send(`**${songQueue.at(-1).title}** added to the queue`)})},
	help: (message) => `play,p [url]: Add a song to the queue
skip,s: Skip the current song
stop,S: End the queue and current song
skipto,st [n]: Skip to the nth song in the queue
queue,q: print the current queue
playtop,pt: Add a song to the front of the queue
help,h: Print this message`};

const playNext = (conn, tc) => {
	if (!songQueue.length) return conn.disconnect();
	let song = songQueue.shift();
	currentDispatcher = conn.play(ytdl(song.url))
		.on('finish', () => playNext(conn, tc))
		.on('error', console.error);
	tc.send(`Now playing: **${song.title}**`)};

const startDispatcher = (vc, tc) =>
	vc.join()
		.then(conn => playNext(conn, tc))
		.catch(console.error);

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
	command[0] = aliases[command[0]] || command;
	let f = botCommands[command[0]];
	if (f) f(message, command.slice(1))
	else message.channel.send(`Invalid command. Use \`${PREFIX}h\` to see a list of commands`)});


