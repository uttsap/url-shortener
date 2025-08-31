### Local Development

In order to develop locally, you can use npm commands to set up dependencies and run services.

First, clone the repo and set up dependencies:

1. Clone the repository
   ```bash
   git clone https://github.com/uttsap/url-shortener.git
   ```
2. Navigate to project directory
   ```bash
   cd url-shortener
   ```
3. Install dependencies
   ```bash
   npm install
   ```
4. Install dependencies for analytics
   ```bash
   cd analytics/
   npm install
   cd ..
   ```
5. Run docker images for postgres, nats and redis
   ```bash
   docker compose -f docker-compose-test.yml up -d
   ```
6. Run migrations
   ```bash
   npm run migrate
   ```
7. Compile and run the project

   ```bash
   # development
   $ npm run start

   # watch mode
   $ npm run start:dev

   # production mode
   $ npm run start:prod
   ```

8. Run tests

   ```bash
   # unit tests
   $ npm run test

   # e2e tests
   $ npm run test:e2e

   # test coverage
   $ npm run test:cov
   ```
