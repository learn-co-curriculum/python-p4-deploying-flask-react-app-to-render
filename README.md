# Deploying a Rails-React App to Heroku

## Learning Goals

- Understand the React build process and how to serve a React app from Flask.
- Understand challenges of client-side routing in a deployed application.
- Deploy a Flask API with a React frontend to Render.

***

## Key Vocab

- **Deployment**: the processes that make an application available for its
  intended use. For web applications, this means moving the application to a
  platform that supports requests from the internet.
- **Developer Operations (DevOps)**: the practices and tools that improve a
  team's ability to develop and deploy applications quickly.
- **PostgreSQL**: an open-source relational database system that provides more
  SQL functionality than SQLite. Unlike SQLite, its data is stored on a server
  rather than in files.
- **Platform as a Service (PaaS)**: a development and deployment platform that
  exists on a wide range of servers with different functionality. PaaS solutions
  reduce maintenance time for a software development team, but can increase
  cost. Some PaaS solutions, such as Render, provide free tiers for small
  applications.

***

## Introduction

In the previous lesson, we deployed a small Flask API application to Render to
learn how the deployment process works in general, and what steps are required
to take the code from our machine and get it to run on a server.

In this lesson, we'll be tackling a more complex app with a modern React-Flask
stack, and explore some of the challenges of getting these two apps to run
together on a single server.

***

## Setup

To follow along with this lesson, we have a pre-built React-Rails application
that you'll be deploying to Heroku. To start, head to this link, and **fork**
and **clone** the repository there:

- [https://github.com/learn-co-curriculum/phase-4-deploying-demo-app](https://github.com/learn-co-curriculum/phase-4-deploying-demo-app)

After downloading the code, set up the repository locally:

```console
$ bundle install
$ rails db:create db:migrate db:seed
$ npm install --prefix client
```

This application has a Rails API with session-based authentication, a React
frontend using React Router for client-side routing, and Postgresql for the
database.

You can run the app locally (assuming you have the Heroku CLI installed) with:

```console
$ heroku local -f Procfile.dev
```

Spend some time familiarizing yourself with the code for the demo app before
proceeding. We'll be walking through its setup and why certain choices were
made through the course of this lesson.

## React Production Build

One of the great features that Create React App provides to developers is the
ability to build different versions of a React application for different
environments.

When working in the **development** environment, a typical workflow for adding
new features to a React application is something like this:

- Run `npm start` to run a development server
- Make changes to the app by editing the files
- View those changes in the browser

To enable this _excellent_ developer experience, Create React App uses
[webpack](https://webpack.js.org/) under the hood to create a development server
with hot module reloading, so any changes to the files in our application will
be instantly visible to us in the browser. It also has a lot of other nice
features in development mode, like showing us good error and warning messages
via the console.

Create React App is _also_ capable of building an entirely different version of
our application for **production**, also thanks to webpack. The end goal of our
application is to get it into the hands of our users via our website. For our
app to run in production, we have a different set of needs:

- **Build** the static HTML, JavaScript and CSS files needed to run our app in
  the browser, keeping them as small as possible
- **Serve** the application's files from a server hosted online, rather than a
  local webpack development server
- Don't show any error messages/warnings that are meant for developers rather
  than our website's users

### Building a Static React App

When developing the frontend of a site using Create React App, our ultimate goal
is to create a **static site** consisting of pre-built HTML, JavaScript, and CSS
files, which can be served by Rails when a user makes a request to the server to
view our frontend. To demonstrate this process of **building** the production
version of our React app and **serving** it from the Rails app, follow these
steps.

**1.** Build the production version of our React app:

```console
$ npm run build --prefix client
```

This command will generate a bundled and minified version of our React app in
the `client/build` folder.

Check out the files in that directory, and in particular the JavaScript files.
You'll notice they have very little resemblance to the files in your `src`
directory! This is because of that **bundling** and **minification** process:
taking the source code you wrote, along with any external JavaScript libraries
your code depends on, and squishing it as small as possible.

**2.** Move our static frontend files to the `/public directory`:

```console
$ mv client/build/* public
```

This command will move all of the files and folders that are inside the
`client/build` directory into to the `public` directory. The `public` directory
is used by Rails to serve **static** assets, so when we run the Rails server, it
will be able to display the files from our production version of the React
application. When a user visits `http://localhost:3000`, Rails will return the
`index.html` file from this directory.

**3.** Run the Rails server:

```console
$ rails s
```

Visit [http://localhost:3000](http://localhost:3000) in the browser. You should
see the production version of the React application!

Explore the React app in the browser using the React dev tools. What differences
do you see between this version of the app and what you're used to when running
in development mode?

Now you've seen how to build a production version of the React application
locally, and some of the differences between this version and the development
version you're more familiar with.

There is one other issue with our React application to dive into before we deploy
it: how can we deal with client-side routing?

### Configuring Rails for Client-Side Routing

In our React application, we're using React Router to handle client-side
routing. Client-side routing means that a user should be able to navigate to the
React application, load all the HTML/CSS/JavaScript code just **once**, and then
click through links in our site to navigate to different pages without making
another request to the server for a new HTML document.

We have two client-side routes defined:

```jsx
// client/src/components/App.js
<Switch>
  <Route path="/new">
    <NewRecipe user={user} />
  </Route>
  <Route path="/">
    <RecipeList />
  </Route>
</Switch>
```

When we run the app using `npm start` and webpack is handling the React server,
it can handle these client-side routing requests just fine! **However**, when
we're running React within the Rails application, we also have routes defined
for our Rails API, and Rails will be responsible for all the routing logic in
our application. So let's think about what will happen from the point of view of
**Rails** when a user makes a request to these routes.

- `GET /`: Rails will respond with the `public/index.html` file
- `GET /new`: Rails will look for a `GET /new` route in the `config/routes.rb`
  file. If we don't have this route defined, it will return a 404 error.

Any other client-side routes we define in React will have the same issue as
`/new`: since Rails is handling the routing logic, it will look for routes
defined in the `config/routes.rb` file to determine how to handle all requests.

We can solve this problem by setting up a **custom route** in our Rails
application, and handle any requests that come through that **aren't** requests
for our API routes by returning the `public/index.html` file instead.

Here's how it works:

```rb
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    resources :recipes, only: [:index, :create]
    post "/signup", to: "users#create"
    get "/me", to: "users#show"
    post "/login", to: "sessions#create"
    delete "/logout", to: "sessions#destroy"
  end

  get "*path", to: "fallback#index", constraints: ->(req) { !req.xhr? && req.format.html? }
end
```

All the routes for our API are defined **first** in the `routes.rb` file. We use
the [namespacing][] to differentiate the API requests from other requests.

The last method in the `routes.rb` file handles all other `GET` requests by
sending them to a special `FallbackController` with an `index` action:

```rb
# app/controllers/fallback_controller.rb
class FallbackController < ActionController::Base
  def index
    render file: 'public/index.html'
  end
end
```

This action has just one job: to render the HTML file for our React application!

> **Note**: It's important that this `FallbackController` inherits from
> `ActionController::Base` instead of `ApplicationController`, which is what
> your API controllers inherit from. Why? The `ApplicationController` class in a
> Rails API inherits from the
> [`ActionController::API` class][actioncontroller api], which doesn't include
> the methods for rendering HTML. For our other controllers, this isn't a
> problem, since they only need to render JSON responses. But for the
> `FallbackController`, we need the ability to render an HTML file for our React
> application.

[actioncontroller api]: https://api.rubyonrails.org/classes/ActionController/API.html

Experiment with the code above. Run `rails s` to run the application. Try
commenting out the last line of the `routes.rb` file, and visit
[http://localhost:3000/new](http://localhost:3000/new). You should see a 404
page. Comment that line back in, and make the same request. Success!

Now that you've seen how to create a production version of our React app
locally, and tackled some thorny client-side routing issues, let's talk about
how to deploy the application to Heroku.

## Heroku Build Process

Think about the steps to build our React application locally. What did we have
to do to build the React application in such a way that it could be served by
our Rails application? Well, we had to:

- Run `npm install --prefix client` to install any dependencies
- Use `npm run build --prefix client` to create the production app
- Move the code from the `client/build` folder to the `public` folder
- Run `rails s`

We would also need to repeat these steps any time we made any changes to the
React code, i.e., to anything in the `client` folder. Ideally, we'd like to be
able to **automate** those steps when we deploy this app to Heroku, so we can
just push up new versions of our code to Heroku and deploy them like we were
able to do in the previous lesson.

Thankfully, Heroku lets us do just that! Let's get started with the deploying
process and talk through how this automation works.

First, in the demo project directory, create a new app on Heroku:

```console
$ heroku create
```

Next, we'll need to tell Heroku that this project is not **just** a Rails
project; we'll need to run some **NodeJS** code as well in order to execute the
build scripts for our React application. We can do this via Heroku
[buildpacks][buildpacks]:

```console
$ heroku buildpacks:add heroku/nodejs --index 1
$ heroku buildpacks:add heroku/ruby --index 2
```

This will tell Heroku to first run a build script for our React app using NodeJS
before running the build script for our Rails app (running `bundle install` and
`rails s`).

To deploy the app, just like before, run:

```console
$ git push heroku main
```

This will kick off the build process on Heroku for the React app, then the Rails
app next. You should be able to visit the deployed site now and see the full
project live on the internet!

To explain the React build process further: we have defined a NodeJS build
process for the React app in the `package.json` file in the **root** directory
of this project. It looks like this:

```json
{
  "name": "phase-4-deploying-app-demo",
  "description": "Build scripts for Heroku",
  "engines": {
    "node": "16.x"
  },
  "scripts": {
    "clean": "rm -rf public",
    "build": "npm install --prefix client && npm run build --prefix client",
    "deploy": "cp -a client/build/. public/",
    "heroku-postbuild": "npm run clean && npm run build && npm run deploy"
  }
}
```

In this file, the `heroku-postbuild` script is the one that will run in Heroku
when we deploy the app. This is the script that automates the steps we outlined
above for building the React app. If you take a closer look at exactly what that
script does, you'll see that it's simply calling each of the other three scripts
we've defined. These scripts run a series of commands to:

- Clean up any old files in the public directory
- Install dependencies and build the React app
- Move the built React app to the `public` folder

A big part of the deployment process is automating features like this to make
future deployments easier. We could have handled this process manually by
running some additional commands on the Heroku server after deploying, but then
we (or other developers) would need to remember to run those same steps any time
changes are made to the React app.

## Conclusion

Creating a website out of multiple applications working together adds a
significant amount of complexity when it comes time to deploy our application.
The upside to this approach is we get to leverage the strengths of each of the
tools we're using: React for a speedy, responsive user interface, and Rails for
a robust, well-designed backend to communicate with the database.

By spending some time upfront to understand and automate parts of the deployment
process, we can make future deployments simpler.

For your future projects using a React frontend and Rails API backend, we'll
provide a template project to use so you don't have to worry about configuring
the tricky parts of the deployment process yourself. However, it's helpful to
have an understanding of this configuration should you wish to customize it
or troubleshoot issues related to deployments in the future.

## Check For Understanding

Before you move on, make sure you can answer the following questions:

1. Why does deploying the production version of our Rails/React app lead to
   routing problems? How can we modify our routes to fix the issue?
2. How does adding a NodeJS build process to the `package.json` file help us?

## Resources

- [Heroku Rails-React Setup](https://blog.heroku.com/a-rock-solid-modern-web-stack)
- [Demo App](https://github.com/learn-co-curriculum/phase-4-deploying-demo-app)

[buildpacks]: https://devcenter.heroku.com/articles/using-multiple-buildpacks-for-an-app
[namespacing]: https://guides.rubyonrails.org/routing.html#controller-namespaces-and-routing
