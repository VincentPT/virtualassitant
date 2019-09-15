var conf = module.exports = {
	graphApiBase: 'https://graph.facebook.com/v3.2',
	ssl : {
		certificatePath:'/etc/letsencrypt/live/sbot.sapiai.com/cert.pem',
		privateKeyPath : '/etc/letsencrypt/live/sbot.sapiai.com/privkey.pem'
	},
    storage : {
        host : 'localhost',
        database : 'sbot',
        user : 'root',
        password : 'root',
    },
	app : {
		id : '518142272016945',
		secretKey: '754efebeef094044bcd013c1ef0c8f2e'
	},
	port: 1338
};
