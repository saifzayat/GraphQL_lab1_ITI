// server.js — modern, clean GraphQL API setup
const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose');
require('dotenv').config();

const Student = require('./models/Student');
const Course = require('./models/Course');

// --- GraphQL Schema ---
const typeDefs = gql`
  type Student {
    id: ID!
    name: String!
    email: String!
    age: Int!
    major: String
    courses: [Course!]!
  }
  type Course {
    id: ID!
    title: String!
    code: String!
    credits: Int!
    instructor: String!
    students: [Student!]!
  }

  type Query {
    getAllStudents: [Student!]!
    getStudent(id: ID!): Student
    getAllCourses: [Course!]!
    getCourse(id: ID!): Course
    searchStudentsByMajor(major: String!): [Student!]!
  }

  type Mutation {
    addStudent(name: String!, email: String!, age: Int!, major: String): Student!
    updateStudent(id: ID!, name: String, email: String, age: Int, major: String): Student
    deleteStudent(id: ID!): Boolean!

    addCourse(title: String!, code: String!, credits: Int!, instructor: String!): Course!
    updateCourse(id: ID!, title: String, code: String, credits: Int, instructor: String): Course
    deleteCourse(id: ID!): Boolean!
  }
`;

// --- Resolvers ---
const resolvers = {
  Query: {
    getAllStudents: async () => Student.find().populate('courses'),
    getStudent: async (_, { id }) => Student.findById(id).populate('courses'),
    getAllCourses: async () => Course.find().populate('students'),
    getCourse: async (_, { id }) => Course.findById(id).populate('students'),
    searchStudentsByMajor: async (_, { major }) => (
      Student.find({ major: new RegExp(`^${major}$`, 'i') }).populate('courses')
    ),
  },
  Mutation: {
    addStudent: async (_, args) => {
      const student = await Student.create(args);
      return student.populate('courses');
    },
    updateStudent: async (_, { id, ...rest }) => (
      Student.findByIdAndUpdate(id, rest, { new: true }).populate('courses')
    ),
    deleteStudent: async (_, { id }) => {
      const student = await Student.findByIdAndDelete(id);
      if (!student) return false;
      await Course.updateMany({ students: student._id }, { $pull: { students: student._id } });
      return true;
    },
    addCourse: async (_, args) => {
      const course = await Course.create(args);
      return course.populate('students');
    },
    updateCourse: async (_, { id, ...rest }) => (
      Course.findByIdAndUpdate(id, rest, { new: true }).populate('students')
    ),
    deleteCourse: async (_, { id }) => {
      const course = await Course.findByIdAndDelete(id);
      if (!course) return false;
      await Student.updateMany({ courses: course._id }, { $pull: { courses: course._id } });
      return true;
    },
  },
};

// --- Server Start Logic ---
async function startServer() {
  const app = express();
  const MONGO_URI = process.env.MONGO_URI;
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer();
