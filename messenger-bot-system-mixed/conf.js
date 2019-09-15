var conf = module.exports = {
	graphApiBase: 'https://graph.facebook.com/v3.2',
	ssl : {
		certificatePath:'',
		privateKeyPath : '',
                ca: ''
	},
    storage : {
        "host" : "localhost",
        "database" : "botmntsys",
        "user" : "root",
        "password" : "mi1234@s"
    },
	app : {
		id : '468383883653735',
		secretKey: 'abe170b678fa07e3d38b0a10f9fd7197'
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
