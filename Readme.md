# 🎨 Collaborative Canvas

A real-time collaborative drawing application built with **HTML5 Canvas**, **Vanilla JavaScript**, **Node.js**, and **Socket.io**.  
Multiple users can draw simultaneously on the same shared canvas, with live cursor tracking, color selection, and undo/redo support.

---

## 🚀 Live Demo
🔗 [https://collaborative-canvas-3j29.onrender.com](https://collaborative-canvas-3j29.onrender.com)

---

## 🧠 Features

- ✏️ Brush, eraser, color palette, and adjustable stroke width  
- 🔄 Undo / Redo (local, with shared support planned)  
- ⚡ Real-time updates using WebSockets (Socket.io)  
- 👥 Multi-user support with live cursor indicators  
- 🧩 Room management on backend (each user gets a unique color)  
- 💬 Server health and room statistics endpoints

---
## 📊 Data Flow Diagram

This diagram illustrates how drawing data flows through the system — from user input on the canvas, through WebSocket communication, to the server, and finally to other connected clients.

Data Flow Diagram ![WhatsApp Image 2025-11-08 at 15 13 05_516c582b](https://github.com/user-attachments/assets/5408c579-03b4-4573-86f3-46996c3158ed)



## ⚙️ Setup Instructions

To run the project locally:

```bash
Clone the repository
git clone https://github.com/V-Sanjith/collaborative-canvas.git

Navigate to the folder
cd collaborative-canvas

Install dependencies
npm install

Start the server
npm start

Then open your browser at:  
👉 [http://localhost:3000](http://localhost:3000)


🧪 How to Test with Multiple Users

1. Start the app locally or open the deployed link.  
2. Open two browser windows.  
3. Draw on one screen — see the strokes appear instantly on the other.  
4. Try:
   - Drawing with different colors  
   - Using the eraser tool  
   - Undo / Redo  
   - Watching the live cursor movements  

🧍 Each connected user is assigned a unique color via the server’s user manager.



 🐞 Known Limitations / Bugs

|         Area       |                        Limitation / Issue                                   |
|------------------- |-----------------------------------------------------------------------------|
|Undo/Redo           |Currently local only — does not propagate across all clients yet.            |
|Conflict Resolution | Overlapping drawings are handled in draw order (no lock mechanism).         |
|Persistence         | Canvas state resets when all users disconnect (no database or storage yet). |
|Performance         | Minor delay with very large stroke data (optimization possible).            |



⏱️ Time Spent

|             Task            | Duration  |
|---------------------------- |-----------|
| Initial setup and structure |  2 hours  |
| Canvas & UI controls        | 3 hours   |
| WebSocket backend setup     | 2 hours   |
| Real-time sync debugging    | 2 hours   |
| Testing + fine-tuning       | 1 hour    |

🕒 Total: ~10 hours of active development

 🧩 Tech Stack

|       Layer     |           Tools Used                 |
|-----------------|--------------------------------------|
| Frontend        | HTML5, CSS3, Vanilla JS (Canvas API) |
| Backend         | Node.js, Express, Socket.io          |
| Hosting         | Render (Free Tier)                   |
| Version Control | Git + GitHub                         |

 🧱 Folder Structure
collaborative-canvas/
│
├── client/
│   ├── index.html
│   ├── style.css
│   ├── main.js
│   ├── canvas.js
│   └── websocket.js
│
├── server/
│   ├── server.js
│   ├── roomManager.js
│   └── drawingState.js
│
├── package.json

 🚀 Future Enhancements
- Add global Undo/Redo synchronization  
- Save and load drawings using a database  
- Display usernames beside live cursors  
- Optimize for mobile and tablet support  
- Add export-to-image functionality