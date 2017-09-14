'use strict';

const apiai = require('apiai');
const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const request = require('request');
const JSONbig = require('json-bigint');
const async = require('async');

const REST_PORT = (process.env.PORT || 5000);
const APIAI_ACCESS_TOKEN = process.env.APIAI_ACCESS_TOKEN;
const APIAI_LANG = process.env.APIAI_LANG || 'en';
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const FB_TEXT_LIMIT = 640;

const FACEBOOK_LOCATION = "FACEBOOK_LOCATION";
const FACEBOOK_WELCOME = "FACEBOOK_WELCOME";

//librerias Firebase y geocoder
var firebase = require('firebase');
var NodeGeocoder = require('node-geocoder');


//conexion a FireBase
const API_KEY_FIREBASE = process.env.API_KEY_FIREBASE;
const AUTHDOMAIN_FIREBASE = process.env.AUTHDOMAIN_FIREBASE;
const DATABASEURL = process.env.DATABASEURL;
const PROJECTID = process.env.PROJECTID;
const STORAGEBUCKET = process.env.STORAGEBUCKET;
const MESSAGINSENDERID = process.env.MESSAGINSENDERID;
var config = {
    apiKey: API_KEY_FIREBASE,
    authDomain: AUTHDOMAIN_FIREBASE,
    databaseURL: DATABASEURL,
    projectId: PROJECTID,
    storageBucket: STORAGEBUCKET,
    messagingSenderId: MESSAGINSENDERID
  };
var defaultApp = firebase.initializeApp(config);
var db = firebase.database();


//conexion a google geocode 
const API_KEY_GEOCODER = process.env.API_KEY_GEOCODER;
var options = {
  provider: 'google',
  // Optional depending on the providers
  httpAdapter: 'https', // Default
  apiKey: API_KEY_GEOCODER, // for Mapquest, OpenCage, Google Premier
  formatter: null         // 'gpx', 'string', ...
};
 
var geocoder = NodeGeocoder(options);

//------------------------------------------------------------------------------
class FacebookBot {
    constructor() {
        this.apiAiService = apiai(APIAI_ACCESS_TOKEN, {language: APIAI_LANG, requestSource: "fb"});
        this.sessionIds = new Map();
        this.messagesDelay = 200;
    }
//---inserta nuevo contexto en arbol proceso--------------
nuevocontexto (idusr,contextoName,contextoValor){
  console.log("conectando a FireBase");
  console.log('defaultApp.name: '+defaultApp.name);  // "[DEFAULT]"
  var db = firebase.database();
  var ref = db.ref("procesos/"); 
  var newRef = ref.child(idusr);
  newRef.child("idfb").set(idusr).then(function (data) {
                          console.log('Firebase data: ', data); 
						  })
  newRef.child(contextoName).set(contextoValor).then(function (data) {
                          console.log('Firebase data: ', data); 
						  })
						  
return null;
}
//-------------------------------------------------------------
//funcion que inicializa las capañas-> envia mensaje a todos los usurios registrados consultado a FireBase 
enviarcamp(callback){	

  var ref = db.ref("/fbregistro");
  var count = 0;
  //se define el template de mensaje que se a enviar
  let messageData = {
						"attachment": 	{
						"type": "template",
						"payload": {
						"template_type":"button",
						"text":"Deseas participar en una encuesta?",
						"buttons":[
						{
						"type":"postback",
						"title":"Simon",
						"payload":"cam010917"
						}
						]
						}					
						}
					}

  //funcion que consulta a FireBase y envia el boton a los FB-ID
	function asyncSqrt(ref,callback) {
		try{
			console.log('START execution');
			ref.on("value", function(snap){
			snap.forEach(function (childSnap){
			var reg = childSnap.val();  
			console.log('registro= ',reg.fbid);
			sendAlertaCam(reg.fbid,messageData);
			})
			callback(null,'OK');
			});
		}  catch (err) {
        console.log('err ',err);
		return null;
        }
	}
  //se define la funcion *sendAlertaCam* para que sea reconocida dentro del metodo snap.forEach de FireBase y permita enviar los mensajes
	function sendAlertaCam(sender, messageData) {
			    console.log('sendFBMessage sender =',sender);
				return new Promise((resolve, reject) => {
				request({
                url: 'https://graph.facebook.com/v2.6/me/messages',
                qs: {access_token: FB_PAGE_ACCESS_TOKEN},
                method: 'POST',
                json: {
                    recipient: {id: sender},
                    message: messageData,
                }
				}, (error, response) => {
                if (error) {
                    console.log('Error sending message: ', error);
                    reject(error);
                } else if (response.body.error) {
                    console.log('Error: ', response.body.error);
                    reject(new Error(response.body.error));
                }

					resolve();
				});
				});
	}

	//se llama a la funcion con una promesa <sincrona>
	asyncSqrt(ref, function (ref, result) {
    console.log('END asyncSqrt and result =', result);
	callback(null,result);
	});

}
doDataResponse(sender, facebookResponseData) {
    if (!Array.isArray(facebookResponseData)) {
        console.log('Response as formatted message');
        this.sendFBMessage(sender, facebookResponseData)
        .catch(err => console.error(err));
    } else {
        async.eachSeries(facebookResponseData, (facebookMessage, callback) => {
            if (facebookMessage.sender_action) {
                console.log('Response as sender action');
                this.sendFBSenderAction(sender, facebookMessage.sender_action)
                    .then(() => callback())
                    .catch(err => callback(err));
                }
                else {
                    console.log('Response as formatted message');
                    this.sendFBMessage(sender, facebookMessage)
                    .then(() => callback())
                    .catch(err => callback(err));
                }
            }, (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log('Data response completed');
                }
            });
    }
}
		
//procesa el mensaje que es debuelto por api ai    
	doRichContentResponse(sender, messages) {
        let facebookMessages = []; // array with result messages
		
        for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
            let message = messages[messageIndex];
			console.log('message.type: '+message.type);
            switch (message.type) {
                //message.type 0 means text message
                case 0:
                    // speech: ["hi"]
                    // we have to get value from fulfillment.speech, because of here is raw speech
                    if (message.speech) {

                        let splittedText = this.splitResponse(message.speech);
						// message.speech contiene el texto del mensaje 
						console.log('message.speech: '+message.speech);
						/*if (message.speech=='Me indicas tú nombre completo, por favor'){
						}*/
							
                        splittedText.forEach(s => {
                            facebookMessages.push({text: s});
                        });
                    }

                    break;
                //message.type 1 means card message
                case 1: {
                    let carousel = [message];

                    for (messageIndex++; messageIndex < messages.length; messageIndex++) {
                        if (messages[messageIndex].type == 1) {
                            carousel.push(messages[messageIndex]);
                        } else {
                            messageIndex--;
                            break;
                        }
                    }

                    let facebookMessage = {};
                    carousel.forEach((c) => {
                        // buttons: [ {text: "hi", postback: "postback"} ], imageUrl: "", title: "", subtitle: ""

                        let card = {};

                        card.title = c.title;
                        card.image_url = c.imageUrl;
                        if (this.isDefined(c.subtitle)) {
                            card.subtitle = c.subtitle;
                        }
                        //If button is involved in.
                        if (c.buttons.length > 0) {
                            let buttons = [];
                            for (let buttonIndex = 0; buttonIndex < c.buttons.length; buttonIndex++) {
                                let button = c.buttons[buttonIndex];

                                if (button.text) {
                                    let postback = button.postback;
                                    if (!postback) {
                                        postback = button.text;
                                    }

                                    let buttonDescription = {
                                        title: button.text
                                    };

                                    if (postback.startsWith("http")) {
                                        buttonDescription.type = "web_url";
                                        buttonDescription.url = postback;
                                    } else {
                                        buttonDescription.type = "postback";
                                        buttonDescription.payload = postback;
                                    }

                                    buttons.push(buttonDescription);
                                }
                            }

                            if (buttons.length > 0) {
                                card.buttons = buttons;
                            }
                        }

                        if (!facebookMessage.attachment) {
                            facebookMessage.attachment = {type: "template"};
                        }

                        if (!facebookMessage.attachment.payload) {
                            facebookMessage.attachment.payload = {template_type: "generic", elements: []};
                        }

                        facebookMessage.attachment.payload.elements.push(card);
                    });

                    facebookMessages.push(facebookMessage);
                }

                    break;
                //message.type 2 means quick replies message
                case 2: {
                    if (message.replies && message.replies.length > 0) {
                        let facebookMessage = {};

                        facebookMessage.text = message.title ? message.title : 'Choose an item';
						console.log('facebookMessage.text: '+facebookMessage.text);
                        facebookMessage.quick_replies = [];

                        message.replies.forEach((r) => {
                            facebookMessage.quick_replies.push({
                                content_type: "text",
                                title: r,
                                payload: r
                            });
                        });

                        facebookMessages.push(facebookMessage);
                    }
                }

                    break;
                //message.type 3 means image message
                case 3:

                    if (message.imageUrl) {
                        let facebookMessage = {};

                        // "imageUrl": "http://example.com/image.jpg"
                        facebookMessage.attachment = {type: "image"};
                        facebookMessage.attachment.payload = {url: message.imageUrl};

                        facebookMessages.push(facebookMessage);
                    }

                    break;
                //message.type 4 means custom payload message
                case 4:
                    if (message.payload && message.payload.facebook) {
                        facebookMessages.push(message.payload.facebook);
                    }
                    break;

                default:
                    break;
            }
        }

        return new Promise((resolve, reject) => {
            async.eachSeries(facebookMessages, (msg, callback) => {
                    this.sendFBSenderAction(sender, "typing_on")
                        .then(() => this.sleep(this.messagesDelay))
                        .then(() => this.sendFBMessage(sender, msg))
                        .then(() => callback())
                        .catch(callback);
                },
                (err) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    } else {
                        console.log('Messages sent');
                        resolve();
                    }
                });
        });

    }
// envia mensaje de texto a facebook messenger <solo texto>
    doTextResponse(sender, responseText) {
        console.log('doTextResponse');
        // facebook API limit for text length is 640,
        // so we must split message if needed
        let splittedText = this.splitResponse(responseText);

        async.eachSeries(splittedText, (textPart, callback) => {
            this.sendFBMessage(sender, {text: textPart})
                .then(() => callback())
                .catch(err => callback(err));
        });
    }

//procesa un mesaje de facebook messenger 	
    //which webhook event
    getEventText(event) {
		
        if (event.message) {
            if (event.message.quick_reply && event.message.quick_reply.payload) {
                console.log('event.message = true');
				return event.message.quick_reply.payload;
            }

            if (event.message.text) {
                console.log('event.message.text = true');
				console.log("event: "+JSON.stringify(event));
				
				/*compara el texto para inicar el envio de campañas
				if(event.message.text=="Enviar Campaña"){
				this.enviarcamp(function (value, result) {
					console.log('campaña enviada =', result);
				});
				return null;
				}*/
				/*responde una locitud de informacion contestando con una imagen 
				if(event.message.text=="info"){
					let messageData = {
						"attachment": 	{
						"type": "image",
						"payload": {"url": "https://imagen.png"
						}
					}
				}
				this.sendFBMessage (event.sender.id,messageData);
				return null;
				}*/
				/*responde a la solicitud para obtener informacion del usuario <nombre>
				if (event.message.text=="Nombre usuario") {
					this.getNombreUSR(event.sender.id);
				}*/
				return event.message.text;
            }
			
        }
		/*se obtiene el payload debuelto por un boton y se envia una palabra reservada a api ai para iniciar un proceso-------------
        if (event.postback && event.postback.payload) {
			console.log('event.postback.payload =',event.postback.payload);
			console.log('event.postback && event.postback.payload = true');
			if(event.postback.payload=='cam010917'){
			//se envia palabra reservada a api ai	
			return 'cam010917';
			}	
            return event.postback.payload;
			
        }*/
		
		//console.log('event.sender.id.toString= '+event.sender.id.toString());
		//console.log('event.sender.id.toString= '+event.message.attachments[0].payload.url.toString());
		//this.doTextResponse('1215350818569477',event.message.attachments[0].payload.url.toString());
		
		/*si recibe una imagen envia un mensaje con la url a un usuario fijo <prueba>
		this.doTextResponse('1963048170387920',event.message.attachments[0].payload.url.toString());
		console.log('return null');*/
        return null;
    }

    getFacebookEvent(event) {
        if (event.postback && event.postback.payload) {

            let payload = event.postback.payload;

            switch (payload) {
                case FACEBOOK_WELCOME:
                    return {name: FACEBOOK_WELCOME};

                case FACEBOOK_LOCATION:
                    return {name: FACEBOOK_LOCATION, data: event.postback.data}
            }
        }

        return null;
    }

    processFacebookEvent(event) {
        const sender = event.sender.id.toString();
        const eventObject = this.getFacebookEvent(event);

        if (eventObject) {

            // Handle a text message from this sender
            if (!this.sessionIds.has(sender)) {
                this.sessionIds.set(sender, uuid.v4());
            }

            let apiaiRequest = this.apiAiService.eventRequest(eventObject,
                {
                    sessionId: this.sessionIds.get(sender),
                    originalRequest: {
                        data: event,
                        source: "facebook"
                    }
                });
            this.doApiAiRequest(apiaiRequest, sender);
        }
    }

    processMessageEvent(event) {
        const sender = event.sender.id.toString();
        const text = this.getEventText(event);

        if (text) {

            // Handle a text message from this sender
            if (!this.sessionIds.has(sender)) {
                this.sessionIds.set(sender, uuid.v4());
            }

            console.log("Text = ", text);
            //send user's text to api.ai service
            let apiaiRequest = this.apiAiService.textRequest(text,
                {
                    sessionId: this.sessionIds.get(sender),
                    originalRequest: {
                        data: event,
                        source: "facebook"
                    }
                });

            this.doApiAiRequest(apiaiRequest, sender);
        }
    }
	//porcesa la respuesta generada por API AI
    doApiAiRequest(apiaiRequest, sender) {
        apiaiRequest.on('response', (response) => {
            if (this.isDefined(response.result) && this.isDefined(response.result.fulfillment)) {
                let responseText = response.result.fulfillment.speech;
                let responseData = response.result.fulfillment.data;
                let responseMessages = response.result.fulfillment.messages;
				//console.log('doApiAiRequest response.result ',response.result);
				//console.log('doApiAiRequest sender: ',sender);
				//console.log('response.result.metadata.intentName: ',response.result.metadata.intentName);
				//console.log('response.result.parameters.valor: ',response.result.parameters.valor);
				//console.log('response.sessionId: ',response.sessionId);
				
				//--Guarda el contexto y la respuesta dada por el usurio en FireBase
				/*if(response.result.metadata.intentName !='Default Fallback Intent' && response.result.parameters.valor!=null){
					var contexto = response.result.metadata.intentName;
					while (contexto.toString().indexOf('.') != -1){
					contexto = contexto.toString().replace('.','-');
					}
					console.log('contexto FB= ',contexto);
					this.nuevocontexto(sender,contexto,response.result.parameters.valor);
				}*/
                if (this.isDefined(responseData) && this.isDefined(responseData.facebook)) {
                    let facebookResponseData = responseData.facebook;
                    this.doDataResponse(sender, facebookResponseData);
                } else if (this.isDefined(responseMessages) && responseMessages.length > 0) {
                    this.doRichContentResponse(sender, responseMessages);
                }
                else if (this.isDefined(responseText)) {
                    this.doTextResponse(sender, responseText);
                }

            }
        });

        apiaiRequest.on('error', (error) => console.error(error));
        apiaiRequest.end();
    }

    splitResponse(str) {
        if (str.length <= FB_TEXT_LIMIT) {
            return [str];
        }

        return this.chunkString(str, FB_TEXT_LIMIT);
    }

    chunkString(s, len) {
        let curr = len, prev = 0;

        let output = [];

        while (s[curr]) {
            if (s[curr++] == ' ') {
                output.push(s.substring(prev, curr));
                prev = curr;
                curr += len;
            }
            else {
                let currReverse = curr;
                do {
                    if (s.substring(currReverse - 1, currReverse) == ' ') {
                        output.push(s.substring(prev, currReverse));
                        prev = currReverse;
                        curr = currReverse + len;
                        break;
                    }
                    currReverse--;
                } while (currReverse > prev)
            }
        }
        output.push(s.substr(prev));
        return output;
    }


    getNombreUSR(sender) {
        return new Promise((resolve, reject) => {
            request({
                url: 'https://graph.facebook.com/v2.6/1215350818569477?access_token=EAAD3bi8tBYwBAKZB7EZAZAYeU7eUxXa5yVph36rr1CGVAUDPez3tjUaaVxZBeY7r8qGRdnP9ZAXL6fMHDjToc9IRpEZA3Su6ehafavPIcs3ZAw5hzUnz1nFCg3wMB4cyAzXdHrYRYOvSkQDxHFhmDkKBJ5Er7mxVXnZAWO0fVMo2zQZDZD',
                method: 'GET'
                
            }, (error, response) => {
                if (error) {
                    console.log('Error sending message: ', error);
                    reject(error);
                } else if (response.body.error) {
                    console.log('Error: ', response.body.error);
                    reject(new Error(response.body.error));
                }
				console.log('response.body ',response.body);
				console.log('JSONbig.parse(req.body).first_name: ',JSONbig.parse(response.body).first_name);
				console.log('resolve: ',resolve);
                resolve();
            });
        });
    }
	
    sendFBMessage(sender, messageData) {
        return new Promise((resolve, reject) => {
            request({
                url: 'https://graph.facebook.com/v2.6/me/messages',
                qs: {access_token: FB_PAGE_ACCESS_TOKEN},
                method: 'POST',
                json: {
                    recipient: {id: sender},
                    message: messageData,
                }
            }, (error, response) => {
                if (error) {
                    console.log('Error sending message: ', error);
                    reject(error);
                } else if (response.body.error) {
                    console.log('Error: ', response.body.error);
                    reject(new Error(response.body.error));
                }

                resolve();
            });
        });
    }

    sendFBSenderAction(sender, action) {
        return new Promise((resolve, reject) => {
            request({
                url: 'https://graph.facebook.com/v2.6/me/messages',
                qs: {access_token: FB_PAGE_ACCESS_TOKEN},
                method: 'POST',
                json: {
                    recipient: {id: sender},
                    sender_action: action
                }
            }, (error, response) => {
                if (error) {
                    console.error('Error sending action: ', error);
                    reject(error);
                } else if (response.body.error) {
                    console.error('Error: ', response.body.error);
                    reject(new Error(response.body.error));
                }

                resolve();
            });
        });
    }

    doSubscribeRequest() {
        request({
                method: 'POST',
                uri: `https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=${FB_PAGE_ACCESS_TOKEN}`
            },
            (error, response, body) => {
                if (error) {
                    console.error('Error while subscription: ', error);
                } else {
                    console.log('Subscription result: ', response.body);
                }
            });
    }

    configureGetStartedEvent() {
        request({
                method: 'POST',
                uri: `https://graph.facebook.com/v2.6/me/thread_settings?access_token=${FB_PAGE_ACCESS_TOKEN}`,
                json: {
                    setting_type: "call_to_actions",
                    thread_state: "new_thread",
                    call_to_actions: [
                        {
                            payload: FACEBOOK_WELCOME
                        }
                    ]
                }
            },
            (error, response, body) => {
                if (error) {
                    console.error('Error while subscription', error);
                } else {
                    console.log('Subscription result', response.body);
                }
            });
    }

    isDefined(obj) {
        if (typeof obj == 'undefined') {
            return false;
        }

        if (!obj) {
            return false;
        }

        return obj != null;
    }

    sleep(delay) {
        return new Promise((resolve, reject) => {
			//console.log('setTimeout',delay);
            setTimeout(() => resolve(), delay);
        });
    }

}


let facebookBot = new FacebookBot();

const app = express();

app.use(bodyParser.text({type: 'application/json'}));

app.get('/webhook/', (req, res) => {
    if (req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);

        setTimeout(() => {
            facebookBot.doSubscribeRequest();
        }, 3000);
    } else {
        res.send('Error, wrong validation token');
    }
});

//procesa la peticion de FB 
app.post('/webhook/', (req, res) => {
    try {
        const data = JSONbig.parse(req.body);
		console.log("req = <--"+JSON.stringify(data)+'-->');
        if (data.entry) {
            let entries = data.entry;
            entries.forEach((entry) => {
                let messaging_events = entry.messaging;
                if (messaging_events) {
                    messaging_events.forEach((event) => {
                        if (event.message && !event.message.is_echo) {

                            if (event.message.attachments) {
								
								//console.log('JSON.stringify(event.message.attachments):<--',JSON.stringify(event.message.attachments)+'-->');
                                let locations = event.message.attachments.filter(a => a.type === "location");
								
                                // delete all locations from original message --> se deven configurar eventos de tipo FACEBOOK_LOCATION en API AI
                                //event.message.attachments = event.message.attachments.filter(a => a.type !== "location");
                                //api ai no esta abilitado para resivir eventos tipo FACEBOOK_LOCATION
								
								if (locations.length > 0) {
									//console.log('latitud:',event.message.attachments[0].payload.coordinates.lat);
									/* se llama a la libreria de geocoder para obtener la rieccion en base a las corrdenas de la ubiacion enviada por el ususrio
									geocoder.reverse({lat:event.message.attachments[0].payload.coordinates.lat, lon:event.message.attachments[0].payload.coordinates.long.toString()})
									.then(function(res) {
									console.log('JSON.stringify(res): ',JSON.stringify(res));
									})
									.catch(function(err) {
									console.log(err);
									});*/
									return null; //<--- quitar si se habilito FACEBOOK_LOCATION en API AI <NO quitar para RedPhone>
                                    locations.forEach(l => {
                                        let locationEvent = {
                                            sender: event.sender,
                                            postback: {
                                                payload: "FACEBOOK_LOCATION",
                                                data: l.payload.coordinates,
                                            }
                                        };
                                        facebookBot.processFacebookEvent(locationEvent);
                                    });
                                }
                            }

                            facebookBot.processMessageEvent(event);
                        } else if (event.postback && event.postback.payload) {
                            if (event.postback.payload === "FACEBOOK_WELCOME") {
                                facebookBot.processFacebookEvent(event);
                            } else {
                                facebookBot.processMessageEvent(event);
                            }
                        }
                    });
                }
            });
        }
		//console.log('res.sessionId: ' + res.sessionId);
        return res.status(200).json({
            status: "ok"
        });
    } catch (err) {
        return res.status(400).json({
            status: "error",
            error: err
        });
    }

});

app.listen(REST_PORT, () => {
    console.log('Rest service ready on port ' + REST_PORT);
});

facebookBot.doSubscribeRequest();
