const express = require('express');
const path = require('path');
const app = express();

const PORT = 3000;

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'signup.html'))
})

app.get('/posts', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'posts.html'))
})

app.get('/post/:postId', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'post.html'));
});

app.get('/write', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'write-post.html'))
})

app.get('/edit/:postId', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'edit-post.html'))
})

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'edit-profile.html'))
})

app.get('/password', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'change-password.html'))
})

app.listen(PORT, "0.0.0.0", () => console.log(`Server on port ${PORT}`));