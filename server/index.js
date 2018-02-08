'use strict';

const PORT =  ( process.env.PORT || 8000 );
const ENV = process.env.NODE_ENV || 'dev';

import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import { visual_recognition, conversation } from 'watson-developer-cloud';
import fs from 'fs';
import NutritionixClient from 'nutritionix';
import request from 'request';
import querystring from 'querystring';
import config from './config.json';

const app = express();

app.use(morgan());
app.use(cors());

app.use(helmet());
app.use(helmet.hidePoweredBy({ setTo: 'PHP 5.5.14' }));
app.use(helmet.xssFilter());
app.disable('x-powered-by');

// Parsers for POST data
app.use(bodyParser.urlencoded({
    limit: '5mb',
    parameterLimit: 100000,
    extended: false 
}));

app.use(bodyParser.json({
    limit: '5mb'
}));

const vr = visual_recognition({
    api_key: config.visualRecognitionKey,
    version: "v3",
    version_date: "2016-05-20"
});

const watsonConversation = conversation({
    username: config.conversation.username,
    password: config.conversation.password,
    version: 'v1',
    version_date: '2017-05-26'
});

//API routes goes here

//UPLOAD IMAGE FOR CALORIES ANALIZE
app.post('/api/uploadpic', (req, res, next) => {
    // SAVE A BASE64 IMAGE, PASS ON BODY REQUEST
    let base64Data = req.body.image.replace(/^data:image\/jpeg;base64,/, "");
    fs.writeFile(path.join(__dirname, 'out.jpeg'), base64Data, 'base64', (err) => {
        if(err) {
            console.log(err);
        } else {
            const params = {
                image_file: fs.createReadStream(path.join(__dirname, 'out.jpeg')),
                classifier_ids: ["food"]
            };

            // IMAGE ANALIZE - WATSON
            vr.classify(params, (err, data) => {
                if (err) {
                    console.log(err);
                } else {
                    const labelsvr = JSON.parse(JSON.stringify(data)).images[0].classifiers[0].classes[0].class;
                    const watsonRes = {
                        score: JSON.parse(JSON.stringify(data)).images[0].classifiers[0].classes[0].score,
                        data: labelsvr
                    };

                    // NUTRIOTIONIX CALL
                    let URI_name = querystring.escape(labelsvr);                    
                    request.get(`https://api.nutritionix.com/v1_1/search/${URI_name}?results=0:20&fields=item_name,brand_name,nf_calories&appId=${config.nutritionix.APPID}&appKey=${config.nutritionix.APPKEY}`, (err, nutryInfo) => {
                        watsonRes.cal = JSON.parse(nutryInfo.body).hits[0].fields.nf_calories; 
                        res.json(watsonRes);
                    });
                }
            });
        }
    });
});

//CONVERSATION Orchestrator
app.post('/api/sendmessage', (req, res, next) => {
    let context;
    if(req.body.id){
        context = JSON.parse(req.body.id)
    }
    const opts = {
        workspace_id: config.conversation.workspaceId,
        input: {'text': req.body.text},
        context: context
    }
    watsonConversation.message(opts, (err, response) => {
        if (err) {
            console.log('error:', err);
        }
        else {
            let resText = response.output.text[0];
            if(resText == 'IMC'){
                let peso = parseInt(response.context.peso);
                let tamanho = parseInt(response.context.tamanho); 
                let imc = peso / ((tamanho/100) * (tamanho/100));
                resText = 'IMC: ' + imc + ', de acordo com a tabela você esta: ';
                if(imc < 17){
                    resText += 'Muito abaixo do Peso';
                    res.json({res: resText, id: response.context});
                } else if(imc < 19){
                    resText += 'Abaixo do Peso';
                    res.json({res: resText, id: response.context});
                }else if(imc < 25) {
                    resText += 'Peso Normal';
                    res.json({res: resText, id: response.context});
                }else if(imc < 30) {
                    resText += 'Acima do Peso';
                    res.json({res: resText, id: response.context});
                }else if(imc < 35) {
                    resText += 'Obesidade 1';
                    res.json({res: resText, id: response.context});
                } else if(imc < 40) {
                    resText += 'Obesidade 2';
                    res.json({res: resText, id: response.context});
                } else {
                    resText += 'Obesidade 3';
                    res.json({res: resText, id: response.context});
                }
            }
            res.json({res: resText, id: response.context});
        }
    });
});

//Call Angular
app.all('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, (err) => {
    if (err) throw err;
    else console.log('[BackEnd] -> http://localhost:' + PORT);
});

export default app;
