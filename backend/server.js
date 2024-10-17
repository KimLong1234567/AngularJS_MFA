const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

require('dotenv').config();

const loginRouters = require('./routers/loginRouters');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/users', loginRouters);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on PORT: ${PORT}.`);
});
