const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const { registerFont } = require('canvas');
const bwipjs = require('bwip-js');
const jsPDF = require('jspdf');
const { Image } = require('canvas');

// Register a font for use in the ticket
registerFont('Roboto-black.ttf', { family: 'Asman' });

async function generateConcertTicket(ticketNumber, eventName, date, time, venue, seatNumber) {
    const canvas = createCanvas(400, 200);
    const ctx = canvas.getContext('2d');

    // Draw ticket background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw ticket header
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Asman';
    ctx.fillText(eventName, 20, 30);
    ctx.font = '14px Asman';
    ctx.fillText(`${date} | ${time}`, 20, 55);
    ctx.fillText(`Venue: ${venue}`, 20, 75);

    // Draw ticket body
    ctx.font = 'bold 16px Asman';
    ctx.fillText(`Ticket Number: ${ticketNumber}`, 20, 105);
    ctx.font = '14px Asman';
    ctx.fillText(`Seat Number: ${seatNumber}`, 20, 125);

    // Generate barcode image
    const barcodeImage = await generateBarcodeImage(ticketNumber);
    ctx.drawImage(barcodeImage, 250, 100, 100, 50);

    // Convert canvas to base64 image
    const ticketImage = canvas.toDataURL().split(';base64,').pop();
    const ticketBuffer = Buffer.from(ticketImage, 'base64');

    // Create a new jsPDF instance
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Add the ticket image to the PDF
    pdf.addImage(ticketBuffer, 'PNG', 0, 0, 210, 297);

    // Save the PDF file
    pdf.save('concert_ticket.pdf');
}

async function generateBarcodeImage(ticketNumber) {
    return new Promise((resolve, reject) => {
        bwipjs.toBuffer({
            bcid: 'code128',
            text: ticketNumber,
            scale: 3,
            height: 10,
            includetext: true,
            textxalign: 'center',
        }, (err, png) => {
            if (err) {
                reject(err);
            } else {
                const image = new Image();
                image.src = 'data:image/png;base64,' + png.toString('base64');
                resolve(image);
            }
        });
    });
}

// Example usage
generateConcertTicket('000001', 'Concert Name', '2024-02-20', '19:00', 'Concert Hall', 'A1');
