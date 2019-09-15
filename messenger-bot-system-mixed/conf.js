var conf = module.exports = {
	graphApiBase: 'https://graph.facebook.com/v3.2',
	ssl : {
		certificatePath:'/etc/letsencrypt/live/c6f95639.ngrok.io/cert.pem',
		privateKeyPath : '/etc/letsencrypt/live/c6f95639.ngrok.io/privkey.pem',
                ca: '/etc/letsencrypt/live/c6f95639.ngrok.io/chain.pem'
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
	port: 1338,

	webhookVerificationToken : "0416C85A-EB4B-45E4-94E9-E5C44E37F516-12032018",
    messaging : {
        testMessages : [
            {
                command : "Country",
                reply : "Viet Nam"
            },
            {
                command : "Time",
                reply : "12:00:00 GMT+7"
            },
            {
                command : "Weather",
                reply : "Warm and cloudy"
            }
        ]
    }
};
