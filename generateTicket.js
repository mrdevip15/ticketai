const { jsPDF } = require('jspdf');
const bwipjs = require('bwip-js');

const generateTicket = async (number) => {
    return new Promise((resolve, reject) => {
        const doc = new jsPDF();
        doc.setFontSize(12);
        doc.text(`Ticket Number: ${number}`, 10, 10);

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
                doc.addImage(imgData, 'PNG', 10, 20, 50, 10);
                resolve(doc);
            }
        });
    });
};

const saveTicket = async (ticket, number) => {
    return new Promise((resolve, reject) => {
        ticket.save(`ticket_${number}.pdf`);
        resolve();
    });
};

const ticketNumber = '00000001'; // Predefined ticket number
generateTicket(ticketNumber)
    .then(ticket => saveTicket(ticket, ticketNumber))
    .then(() => console.log(`Ticket ${ticketNumber} generated successfully.`))
    .catch(error => console.error(error));
