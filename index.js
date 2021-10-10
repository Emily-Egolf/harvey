const Discord = require('discord.js');
const { PREFIX, TOKEN } = require('./config.json');
const ytdl = require('ytdl-core');

let client;

const initClient = () => {
	client = new Discord.Client();
	client.login(TOKEN);
	client.once('ready', () => console.log('Ready!'));
	client.once('reconnecting', () => console.log('Reconnecting!'));
	client.once('disconnect', () => console.log('Disconnect!'));
	client.on('error', err => {
		const t = Date.now();
		console.error(err);
		currentDispatcher = null;
		initClient();
		botCommands.playtop(currentSong.message, [currentSong.url,
				currentSong.seek + ((t - currentSong.startTime) / 1000)])})};

initClient();

let currentDispatcher;
let currentSong;
let songQueue = [];
const botCommands = {
	play: async (message, [url, seek], top) => {
		const vc = message.member.voice.channel;
		if (!vc) return 'You must be in a voice channel to play music';
		const addSong = top ? [].unshift : [].push;
    try {
      const info = await ytdl.getInfo(url)
      addSong.apply(songQueue, [{
        title: info.videoDetails.title,
        url: info.videoDetails.video_url,
        seek,
				message,
				startTime: Date.now()}]);
      if (!currentDispatcher) return await startDispatcher(vc, message.channel)
      else return `**${songQueue.at(-1).title}** added to the queue`}
    catch (err) {
				console.error(err);
				clearSongState();
				return `harvey don't want to play songs no more`}},
	skip: async () => {if (currentDispatcher) currentDispatcher.end()},
	stop: async () => {clearSongState()},
	skipto: async (_, [n]) => {if (currentDispatcher) {songQueue = songQueue.slice(n-1); currentDispatcher.end()}},
  queue: async message => songQueue[0] ?
    songQueue
      .map((s,i) => `${i+1}. **${s.title}**`)
      .reduce((a,l) => a+'\n'+l) :
    `Harvey ain't playing songs no more`,
	playtop: async (message, args) => {await botCommands.play(message, args, 1)},
	seek: async (message, [seek]) => {
		if (currentDispatcher && currentSong && seek) {
			await botCommands.playtop(message, [currentSong.url, seek]);
			botCommands.skip()}},
  help: async () =>
`The current command prefix is: **${PREFIX}**
**play, p [url] [time]**: Add a song to the queue optionally specify the timestamp to start at
**skip, s**: Skip the current song
**stop, S**: End the queue and current song
**skipto, st [n]**: Skip to the nth song in the queue
**queue, q**: Print the current queue
**playtop, pt**: Add a song to the front of the queue
**seek, se [time]**: Seek to a time hh:mm:ss
**help, h**: Print this message`};

const clearSongState = () => {
	songQueue = [];
	currentSong = null;
	currentDispatcher = currentDispatcher	? currentDispatcher.end() : null};

const timestamp2sec = (seek, scalars=[1, 60, 60**2]) =>
	seek && seek.match(/^(\d:)?(\d{1,2}:)?\d{1,2}$/) ?
		seek.split(':').slice(-3).reverse()
			.reduce((a,v,i) => a+(v*scalars[i]),0) :
		0;

const playNext = (conn, tc) => {
	if (!songQueue.length) return currentDispatcher = conn.disconnect();
	currentSong = songQueue.shift();
	const seek = timestamp2sec(currentSong.seek);
	currentDispatcher = conn.play(ytdl(currentSong.url), {seek})
		.on('finish', () => playNext(conn, tc))
		.on('error', console.error);
	tc.send(`Now playing: **${currentSong.title}**${seek ? ` at **${currentSong.seek}**` : ''}`)};

const startDispatcher = async (vc, tc) => {
	const conn = await vc.join()
  try {playNext(conn, tc)}
  catch (err) {
    console.error(err);
    clearSongState();
    return `Harvey can't be found at the moment, but we'll find him soon enough`}};

client.on('message', async message => {
	if (message.author.bot) return;
	if (!message.content.startsWith(PREFIX)) return;
	const command = message.content.slice(1).split(' ');
	const aliases = {
		p  : 'play',
		s  : 'skip',
		S  : 'stop',
		st : 'skipto',
		q  : 'queue',
		pt : 'playtop',
		se : 'seek',
		h  : 'help'};
	command[0] = aliases[command[0]] || command[0];
	const f = botCommands[command[0]];
  const res = f ?
    await f(message, command.slice(1)) :
    `Invalid command. Use \`${PREFIX}h\` to see a list of commands`;
	if (res) message.channel.send(res)});


