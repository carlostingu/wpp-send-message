require("dotenv").config();

/* Core */
const fs = require('fs');

/* Modules */
const wpp = require("./src/wpp");
const mail = require("./src/mail");
const Excel = require('./src/excel');

(async () => {
    /* 
        5521998912078@c.us -> format accept
        name: ${contact.getCell(2).value} 
        phone: ${contact.getCell(4).value}
        /\([1-9]{2}\)[9]{1}[0-9]{4}\-[0-9]{4}/gmi -> verify phone
    */

    const client = await wpp.create(
        "inactives",
        (base64Qrimg, asciiQR, attempts, urlCode) => {
            console.log(asciiQR);
        },
        undefined, 
        {
            disableWelcome: true
        }
    );

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    var d = new Date();
    var day = String(d.getDate());

    var month = String(d.getMonth() + 1);
    if (month.length == 1) {
        month = `0${month}`;
    }

    var year = d.getFullYear();
    var dayWeek = d.getDay();

    var hour = String(d.getHours());
    if (hour.length == 1) {
        hour = `0${hour}`;
    }

    var minutes = String(d.getMinutes());
    if (minutes.length == 1) {
        minutes = `0${minutes}`;
    }

    var seconds = String(d.getSeconds());
    if (seconds.length == 1) {
        seconds = `0${seconds}`;
    }

    var logDate = `${day}/${month}/${year} às ${hour}:${minutes}:${seconds}`;

    const keywords = [
        "1",
        "Sim",
        "sim"
    ];

    const clients = [];
    while (true) {
        if (dayWeek != 0 && hour > 7 && hour < 20) {
            client.onMessage(async (message) => {
                if (keywords.indexOf(message.body) != -1 && clients.indexOf(message.from) == -1 && message.isGroupMsg === false) {
                    clients.push(message.from);

                    try {
                        await sleep(5000);

                        await client.sendText(message.from, `Em breve um de nossos atendentes entrará em contato com você...`);
                    } catch (error) {
                        console.log(`Houve um erro ao enviar a mensagem...`);

                        fs.writeFile('./logs.txt', `Houve um erro ao enviar a mensagem em ${logDate}\n`, { flag : 'a' }, error => {
                            if (error) {
                                console.log(`Houve um erro ao escrever no arquivo...`);
                            }
                        });
                    }
        
                    // create reusable transporter object using the default SMTP transport
                    let transporter = mail.createTransport({
                        host: process.env.EMAIL_HOST,
                        port: process.env.EMAIL_PORT,
                        secure: true, // true for 465, false for other ports
                        auth: {
                            user: process.env.EMAIL_USER, // generated ethereal user
                            pass: process.env.EMAIL_PASS, // generated ethereal password
                        },
                    });
        
                    try {
                        // send mail with defined transport object
                        let info = await transporter.sendMail({
                            from: `${process.env.EMAIL_NAME} ${process.env.EMAIL_USER}`, // sender address
                            to: `Vendas, ${process.env.EMAIL_USER}`, // list of receivers
                            subject: "Reativação", // Subject line
                            html: `<b>Nome: ${message.sender.pushname ?? "S/N"} <br> Numero: ${message.sender.id.substr(2, 11)} <br> Mensagem: ${message.body}</b>`, // html body
                        });
                    } catch (error) {
                        console.log(`Houve um erro ao enviar o e-mail...`);
                    }
                }
            });
            
            var index = 0;
            var listInactives = new Excel.stream.xlsx.WorkbookReader('./files/inativos.xlsx');
            for await (var contacts of listInactives) {
                for await (var contact of contacts) {
                    var patternPhone = new RegExp(/\([1-9]{2}\)9[0-9]{4}\-[0-9]{4}/gmi);
                    if (String(contact.getCell(4).value).match(patternPhone)) {
                        var phone = String(contact.getCell(4).value).replace("-", "");
                        phone = phone.replace("(", "");
                        phone = phone.replace(")", "");
                        phone = phone = `55${phone}@c.us`;
                        
                        var name = contact.getCell(2).value;

                        if (index < 5) {
                            try {
                                index++;

                                var message = `Olá ${name} Ganhe desconto especial retornando para a *Carioca Proteção Veicular* agora mesmo! Você pode ganhar  *Até 20% de desconto todos os meses no seu Boleto e Adesão Grátis*, uma associação com milhares de associados satisfeitos. *VEM PARA CARIOCA VOCÊ TAMBÉM, VEM!* \n 1 - Sim \n 2 - Não`;
                                
                                await client.sendText("5521998912078@c.us", message);

                                fs.writeFile('./logs.txt', `Mensagem enviada para ${name} em ${logDate}\n`, { flag : 'a' }, error => {
                                    if (error) {
                                        console.log(`Houve um erro ao escrever no arquivo...`);
                                    }
                                });
                            } catch (error) {
                                fs.writeFile('./logs.txt', `Mensagem NÃO enviada para ${name} em ${logDate}\n`, { flag : 'a' }, error => {
                                    if (error) {
                                        console.log(`Houve um erro ao escrever no arquivo...`);
                                    }
                                });
                            }
                        } else {
                            index = 0;
                            await sleep(600000);
                        }
                    }
                }
            }

            console.log(`Concluido com sucesso :)`);
            return;
        }
    }
})();