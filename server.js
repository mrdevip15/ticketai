// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const crypto = require('crypto');
const ejs = require("ejs");
const app = express();
const handlebars = require('handlebars');
const { jsPDF } = require('jspdf');
const bwipjs = require('bwip-js');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
app.set('view engine', 'ejs');
app.use('/', express.static("public"));
app.use(cookieParser());
// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ticketDB', { useNewUrlParser: true, useUnifiedTopology: true });

// Define ticket schema
const ticketSchema = new mongoose.Schema({
    ticket: { type: String, required: true, unique: true },
    ticketId : String,
    email : String,
    fullname: String,
    sekolah : String,
    tel: String,
    status: Boolean,
    verified : Boolean,
    send : Boolean
});
const adminSchema = new mongoose.Schema({
    nama: String,
    email: String,
    hashedEmail: String,
    password: String

});
function md5(string) {
    return crypto.createHash('md5').update(string).digest('hex');
  }
const Ticket = mongoose.model('Ticket', ticketSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Route to render the register ticket form
app.get('/register', (req, res) => {
    res.render('register-ticket');
});
function generateRandomTicket(length) {
    let result = '';
    const characters = '0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
// Route to handle form submission and save ticket data
app.post('/register', async (req, res) => {
    const { fullname, tel, email, sekolah } = req.body;
    const ticketNumber = generateRandomTicket(10)
    // Create a new ticket object
    const newTicket = new Ticket({
        ticket : ticketNumber,
        fullname,
        email,
        sekolah,
        ticketId : md5(ticketNumber),
        tel,
        status: false // Set initial status to false (not used)
    });

    // Save the new ticket to the database
    await newTicket.save();
    await generateTicket(md5(ticketNumber), fullname)
    .then(ticket => saveTicket(ticket, ticketNumber))
    .then(() => console.log(`Ticket ${ticketNumber} generated successfully.`))
    .catch(error => console.error(error));
    
    res.redirect('/success/' +fullname+ '/' + sekolah)
});
app.get('/success/:fullname/:sekolah', async (req, res) => {
    res.render('success', 
    {
        fullname : req.params.fullname,
        sekolah : req.params.sekolah
    });
})
app.get('/scan', async (req, res) => {
    res.render('scan');
})
app.get("/logout", function (req, res) {
    const options = {
        maxAge: 1, // would expire after 15 minutes
        httpOnly: true, // The cookie only accessible by the web server
    }
    res.cookie("signedAdmin", "", options);
    res.redirect("/login");
});
app.get('/emailTicket/:tickedId', async (req, res) => {
    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    const ticket = await Ticket.findById( req.params.tickedId );
    const filename = "ticket_" + ticket.ticket + ".pdf"

    
    // Setup email data
    let templateHtml = fs.readFileSync('email.html', 'utf8');

// Compile the template using Handlebars
    let template = handlebars.compile(templateHtml);

    // Define the dynamic data
    let data = {
        name: ticket.fullname,
        ticket : ticket.ticket,
        link : req.hostname + "/ticket/" + filename
    };

    // Render the template with the dynamic data
    let ampHtml = template(data);
    let mailOptions = {
        from: process.env.SMTP_USER,
        to: 'mrdevip15@gmail.com',
        subject: 'Konfirmasi Email',
        html: ampHtml
    };
    
    // Send email
    transporter.sendMail(mailOptions, async (error, info) => {
        if (error) {
            console.log('Error occurred:', error.message);
            return;
        }
        console.log('Email sent:', info.messageId);
        ticket.send = true
        await ticket.save()
        res.redirect("/verified-ticket")
    });
    
})

app.post('/scan', async (req, res) => {
    const { ticket } = req.body;

    // Check if ticket exists in the database
    const existingTicket = await Ticket.findOne({ ticketId : ticket });

    if (!existingTicket) {
        return res.status(404).json({ message: 'Ticket not found' });
    }

    // Update ticket status
    

    // Send response based on status
    if (!existingTicket.status) {
        existingTicket.status = !existingTicket.status;
        await existingTicket.save();
        res.json({ message: 'Ticket used successfully', ticket:existingTicket.ticket, fullname: existingTicket.fullname, tel: existingTicket.tel });
    } else {
        res.json({ message: 'Ticket already used, personal data:', ticket:existingTicket.ticket, fullname: existingTicket.fullname, tel: existingTicket.tel });
    }
});

const generateTicket = async (number,name) => {
    return new Promise((resolve, reject) => {
        const doc = new jsPDF();
        doc.setFontSize(12);
        doc.text(`${number}`, 10, 10);
        doc.text(`Nama: ${name}`, 10, 20);

        bwipjs.toBuffer({
            bcid: 'code128',       // Barcode type
            text: number,          // Text to encode
            scale: 3,              // 3x scaling factor
            height: 10,            // Bar height, in millimeters
            includetext: true,     // Show human-readable text
            textxalign: 'center',  // Center text
        }, (err, png) => {
            if (err) {
                reject(err);
            } else {
                const imgData = 'data:image/png;base64,' + png.toString('base64');
                doc.addImage(imgData, 'PNG', 10, 30, 50, 10);
                resolve(doc);
            }
        });
    });
};

const saveTicket = async (ticket, number) => {
    const folderPath = "./public/ticket"
    return new Promise((resolve, reject) => {
        const filePath = path.join(folderPath, `ticket_${number}.pdf`);
        ticket.save(filePath);
        resolve(filePath);
    });
};
 
// Admin page
// login page
app.get("/", function (req,res){
    res.redirect("/login")
})

app.get("/dashboard", async function (req,res){
    if (req.cookies.signedAdmin) {
        const ticket = await Ticket.find()
        res.render("user", {ticket})
    } else {
        res.redirect("/login")
    }

})
app.get("/verified-ticket", async function (req,res){
    if (req.cookies.signedAdmin) {
        const ticket = await Ticket.find({verified : true})
        res.render("verified-ticket", {ticket})
    } else {
        res.redirect("/login")
    }

})
app.get("/verify/:ticketId", async function (req,res){
    if (req.cookies.signedAdmin) {
        const ticket = await Ticket.findById(req.params.ticketId)
        if(!ticket.send){
            ticket.verified = !ticket.verified
            await ticket.save()
            res.redirect("/dashboard")
        } else {
            res.redirect("/dashboard?error=already-sent")
        }
        
        
        
    } else {
        res.redirect("/login")
    }

})
app.get("/login", function (req,res){
    res.render("loginAdmin")
})
app.post("/login", async function (req, res) {
 
    const admin = await Admin.findOne({
        email: req.body.email })
    // console.log(admin)

        if (!admin) {
            res.render("404", {
                message1 : 'Email tidak ditemukan',
                message2 : 'Kembali ke halaman utama',
                url : '/'
            });
        } else {
            if (admin.password == md5(req.body.password)) {
                const options = {
                    maxAge: 1000 * 60 * 9999, // would expire after 15 minutes
                    httpOnly: true, // The cookie only accessible by the web server
                }
                res.cookie("signedAdmin", admin.hashedEmail, options);
                res.redirect("/dashboard");
            } else {
                res.render("404", {
                    message1 : 'Password salah',
                    message2 : 'Kembali ke halaman login',
                    url : '/login'
                });
            }
        }

    });

// scan page

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
