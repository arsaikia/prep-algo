# PrepAlgo

A comprehensive platform for practicing algorithm problems with real-time code execution and test case validation. Built with modern web technologies to provide an interactive coding experience.

## 🚀 Features

- **Interactive Code Editor**: Monaco Editor integration for a professional coding experience
- **Real-time Code Execution**: Execute code in multiple programming languages
- **Test Case Validation**: Automatic testing with custom test cases
- **User Authentication**: Secure login with Google OAuth integration
- **Progress Tracking**: Monitor your algorithm practice progress
- **Problem Categories**: Organized problem sets by difficulty and topic
- **Smart Recommendations**: AI-powered daily problem recommendations with adaptive learning
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 📚 Documentation

- **[Smart Hybrid Recommendations](SMART_HYBRID_README.md)** - Advanced AI recommendation system ⭐ **Active**
- **[System Migration Guide](SYSTEM_MIGRATION.md)** - Migration from legacy systems
- **[Daily Recommendations](DAILY_RECOMMENDATIONS_README.md)** - Basic daily problem system (Legacy)
- **[Recommendation Improvements](RECOMMENDATION_IMPROVEMENTS.md)** - System enhancement notes
- **[Color System](COLOR_SYSTEM_README.md)** - UI design guidelines
- **[Tracking Implementation](TRACKING_IMPLEMENTATION.md)** - Progress tracking details

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **Redux Toolkit** - State management
- **Monaco Editor** - Professional code editor
- **Styled Components** - CSS-in-JS styling
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing

### DevOps
- **Docker** - Containerization
- **Google Cloud Platform** - Deployment and hosting
- **ESLint** - Code linting
- **Nodemon** - Development server with auto-reload

## 📋 Prerequisites

- Node.js (>= 18.0.0)
- npm or yarn
- MongoDB instance
- Google OAuth credentials (for authentication)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/arsaikia/prep-algo.git
   cd prep-algo
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   npm run install-server
   
   # Install frontend dependencies
   npm run install-client
   ```

3. **Environment Setup**
   
   Create a `.env` file in the backend directory:
   ```env
   PORT=8080
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   BASE_URI=http://localhost:3000
   CORS_ORIGINS=http://localhost:3000,http://192.168.1.234:3000
   ```

4. **Start the development servers**
   ```bash
   # Start both frontend and backend in development mode
   npm run dev
   
   # Or start them separately:
   # Backend only
   npm run server
   
   # Frontend only
   npm run client
   ```

## 🎯 Usage

1. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080

2. **Authentication**
   - Sign in using your Google account
   - Or create a new account with email/password

3. **Practice Algorithms**
   - Browse available problems by category
   - Write your solution in the code editor
   - Submit your code for execution
   - View test case results and performance metrics

## 📁 Project Structure

```
prep-algo/
├── backend/                 # Backend server
│   ├── config/             # Database and app configuration
│   ├── controller/         # Request handlers
│   ├── middleware/         # Custom middleware
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
│   └── server.js           # Main server file
├── frontend/               # React application
│   ├── public/             # Static assets
│   ├── src/                # Source code
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── redux/          # Redux store and slices
│   │   └── utils/          # Utility functions
│   └── package.json
├── package.json            # Root package.json
└── README.md
```

## 🚀 Deployment

### Using Docker

1. **Build the Docker image**
   ```bash
   docker build -t prep-algo .
   ```

2. **Run the container**
   ```bash
   docker run -p 8080:8080 prep-algo
   ```

### Google Cloud Platform

The project includes Google Cloud Build configuration. Deploy using:

```bash
gcloud builds submit --config backend/cloudbuild.yaml
```

## 📝 Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend in development mode
- `npm run server` - Start backend server with nodemon
- `npm run client` - Start frontend development server
- `npm run install-server` - Install backend dependencies
- `npm run install-client` - Install frontend dependencies
- `npm run build-client` - Build frontend for production

### Backend
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Arunabh Saikia**
- GitHub: [@arsaikia](https://github.com/arsaikia)

## 🐛 Issues

If you find any bugs or have feature requests, please [open an issue](https://github.com/arsaikia/prep-algo/issues) on GitHub.

## 📞 Support

For support, email support@prepalgo.com or join our Slack channel.

---

**Happy Coding! 🎉**