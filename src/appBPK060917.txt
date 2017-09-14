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
var firebase = require('firebase');
var respuesta ="";
var idusr =""; 
var lista=[];
var config = {
    apiKey: "AIzaSyBy8uGZdOz_5Pbw1YkjM9vx9GDmWAF5w44",
    authDomain: "turnosmovil-a576d.firebaseapp.com",
    databaseURL: "https://turnosmovil-a576d.firebaseio.com",
    projectId: "turnosmovil-a576d",
    storageBucket: "turnosmovil-a576d.appspot.com",
    messagingSenderId: "706329874359"
  };
var defaultApp = firebase.initializeApp(config);
var db = firebase.database();
/*function consultarID(idusuario){
  console.log("conectando a FireBase");
  console.log('defaultApp.name: '+defaultApp.name);  // "[DEFAULT]"
  var db = firebase.database();
  var ref = db.ref("fbregistro/"+idusuario); 
  //---------------------------------------------------
//Attach an asynchronous callback to read the data at our posts reference
  var ultimarespuesta="";
  ref.on("value", function(snapshot) {
  var registro = snapshot.val();
  console.log("registro.val: "+registro);
  console.log("registro.ultimapeticion: " + registro.ultimapeticion);
  console.log("registro.ultimarespuesta: " + registro.ultimarespuesta);
  ultimarespuesta = registro.ultimarespuesta;
}, function (errorObject) {
  console.log("The read failed: " + errorObject.code);
});
return ultimarespuesta;
}

function procesoAlta (idpro, idusr, valor){ 
  console.log("Insertar Registro");
  console.log('defaultApp.name: '+defaultApp.name);  // "[DEFAULT]"
  var db = firebase.database();
  var ref = db.ref("fbregistro/"); 
  //var newRef = ref.push();
  var newRef = ref.child(idusr);
  if(idpro=='A1'){
  newRef.child("ALTA1").set(valor).then(function (data) {
                          console.log('Firebase data: ', data); 
						  })
  }
  if(idpro=='A2'){						  
  newRef.child("ALTA1").set(valor).then(function (data) {
                          console.log('Firebase data: ', data); 
						  })
  }
}
//---inserta nuevo registro de usurios en procesos--------------
function nuevoproceso (idusr){ 
  console.log("conectando a FireBase");
  console.log('defaultApp.name: '+defaultApp.name);  // "[DEFAULT]"
  var db = firebase.database();
  var ref = db.ref("procesos/"); 
  //var newRef = ref.push();
  var newRef = ref.child(idusr);
  newRef.child("idfb").set(idusr).then(function (data) {
                          console.log('Firebase data: ', data); 
						  })
  newRef.child("limite").set("3").then(function (data) {
                          console.log('Firebase data: ', data); 
						  })
  newRef.child("paso").set("0").then(function (data) {
                          console.log('Firebase data: ', data); 
						  })
  newRef.child("proceso").set("alta").then(function (data) {
                          console.log('Firebase data: ', data); 
						  })
						  
}
//-------------------------------------------------------------

//funcion que verifica el estado de la solicitus de alta 
function consultarProceso(idusuario){
  console.log("conectando a FireBase");
  console.log('defaultApp.name: '+defaultApp.name);  // "[DEFAULT]"
  var db = firebase.database();
  var ref = db.ref("procesos/"+idusuario); 
  //---------------------------------------------------
//Attach an asynchronous callback to read the data at our posts reference
  var paso="_";
  ref.on("value", function(snapshot) {
  var registro = snapshot.val();
  if(registro==null){
	return paso;  
  }
  console.log("registro.val: "+registro);
  console.log("registro.idfb: " + registro.idfb);
  console.log("registro.paso: " + registro.paso);
  console.log("registro.limite " + registro.limite);
  console.log("registro.proceso " + registro.proceso);
  paso = registro.paso;
  
}, function (errorObject) {
  console.log("The read failed: " + errorObject.code);
  return errorObject.code;
});
return paso;
}
*/


//------------------------------------------------------------------------------
class FacebookBot {
    constructor() {
        this.apiAiService = apiai(APIAI_ACCESS_TOKEN, {language: APIAI_LANG, requestSource: "fb"});
        this.sessionIds = new Map();
        this.messagesDelay = 200;
    }

//funcion que inicializa las encuestas-consulta id de usuarios registrados en Firebase------------------------ 
listarRegistrados(callback){	

  var ref = db.ref("/fbregistro");
  var count = 0;
  lista=[];

function asyncSqrt(ref,callback) {
    try{
	console.log('START execution');
	ref.on("value", function(snap){
		snap.forEach(function (childSnap){
			var reg = childSnap.val();  
			console.log('registro= ',reg.fbid);
			lista.push(reg.fbid);
		})
		callback(null,lista);
	});
	}  catch (err) {
        console.log('err ',err);
		return null;
        }
}

 
asyncSqrt(ref, function (ref, result) {
    console.log('END asyncSqrt and result =', result);
	
	//var resultado=result;
	//var resultado =result;
	callback(null,result);
});

//console.log('END lista.length=',lista.length);
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
						console.log('message.speech: '+message.speech);
						if (message.speech=='Me indicas tú nombre completo, por favor'){
						
						}
							
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
				if(event.message.text=='Registrarse'){
					//console.log('estado proceso alta= ',consultarProceso(event.sender.id));
					return 'Alta_0';
				}
				if(event.message.text=="Consulta usuario"){
				//console.log('consultarID = '+consultarID(event.sender.id));
				//this.doTextResponse(event.sender.id.toString(),"la ultima repuesta fue :"+consultarID(event.sender.id)+" :) ");
				}
				if(event.message.text=="Xx"){
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
				
				this.listarRegistrados(function (value, result) {
					console.log('result2 =', result);
				});
				asyncSqrt2(200, function (value, result) {
                    console.log('END execution with value =', value, 'and result =', result);
					console.log('lista.length= ', lista.length);
					for (var i = 0; i < lista.length; i++) {
					console.log('lista['+i+']: '+lista[i]);	
					var idfb=lista[i];
					sendFBMessage (idfb,messageData);
					}
                    console.log('COMPLETED');
                 });
				 
				function sendFBMessage(sender, messageData) {
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
				function asyncSqrt2(value, callback) {
				setTimeout(function () {	
				callback(value, value * value);
				},value);
				}
				/*function asyncSqrt2(callback) {
				console.log('tamalo de la lista =', lista.length);
				//contruir json para enviar boton de campaña
					let messageData = {
						"attachment": 	{
						"type": "template",
						"payload": {
						"template_type":"button",
						"text":"Deseas participar en una encuesta?",
						"buttons":[
						{
						"type":"postback",
						"title":"Simon ese",
						"payload":"cam010917"
						}
						]
						}					
					}
				}
				//se enviar el mesaje a los usrios de la lista 
				
				for (var i = 0; i < lista.length; i++) {
				console.log('lista['+i+']: '+lista[i]);	
				//this.sendFBMessage (value[i],messageData);
				}
				callback(null,'OK');
				}
				*/
					
				return 'test';
				}
				if(event.message.text=="info"){
					let messageData = {
						"attachment": 	{
						"type": "image",
						"payload": {"url": "https://uuajpq.dm2302.livefilestore.com/y4pV0o-PnYo4EGr72neSDx4EqAjD4V7qsN3ztz15n29PoU5dhLwk0psbiVNb2xcNG0oV-GiradMklm2luhQEBbpSxLS1No48bQnLQ3R41IpCji9qLW1H_QwtOtmdSHxjqkblqULTblMIaigctMh5TwP72aFyJ_r9V0rOUPu52bQVvjml0V8-H5cCkSp29E4mjje/coca_logo2.png"
						}
					}
				}
				this.sendFBMessage (event.sender.id,messageData);	
				}
				if (event.message.text=="Nombre usuario") {
					this.getNombreUSR(event.sender.id);
				}
				return event.message.text;
            }
			
        }

        if (event.postback && event.postback.payload) {
			console.log('event.postback.payload =',event.postback.payload);
			console.log('event.postback && event.postback.payload = true');
			if(event.postback.payload=='cam010917'){
			return 'cam010917';
			}	
            return event.postback.payload;
			
        }
		
		console.log('event.sender.id.toString= '+event.sender.id.toString());
		console.log('event.sender.id.toString= '+event.message.attachments[0].payload.url.toString());
		this.doTextResponse('1215350818569477',event.message.attachments[0].payload.url.toString());
		this.doTextResponse('1963048170387920',event.message.attachments[0].payload.url.toString());
		console.log('return null');
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

    doApiAiRequest(apiaiRequest, sender) {
        apiaiRequest.on('response', (response) => {
            if (this.isDefined(response.result) && this.isDefined(response.result.fulfillment)) {
                let responseText = response.result.fulfillment.speech;
                let responseData = response.result.fulfillment.data;
                let responseMessages = response.result.fulfillment.messages;
				console.log('response.result.metadata.intentName: ',response.result.metadata.intentName);
				console.log('response.result.parameters.valor: ',response.result.parameters.valor);
				console.log('response.sessionId: ',response.sessionId);
				if (response.result.metadata.intentName=='redphone.agente.alta.pregunta1'){
					//procesoAlta("A1",sender,response.result.parameters.valor);
				}
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

app.post('/webhook/', (req, res) => {
    try {
        const data = JSONbig.parse(req.body);
		console.log("req = "+JSON.stringify(data));
        if (data.entry) {
            let entries = data.entry;
            entries.forEach((entry) => {
                let messaging_events = entry.messaging;
                if (messaging_events) {
                    messaging_events.forEach((event) => {
                        if (event.message && !event.message.is_echo) {

                            if (event.message.attachments) {
								
								console.log('event.message.attachments= ',event.message.attachments);
                                let locations = event.message.attachments.filter(a => a.type === "location");
                                // delete all locations from original message
                                event.message.attachments = event.message.attachments.filter(a => a.type !== "location");

                                if (locations.length > 0) {
                                    locations.forEach(l => {
                                        let locationEvent = {
                                            sender: event.sender,
                                            postback: {
                                                payload: "FACEBOOK_LOCATION",
                                                data: l.payload.coordinates
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
