
Load tester to simulate graphql based api (currently only works with Apollo graphql queries). 
Scenarios can be used to simulate user behaviours.

#**Installation**
```
  npm i gql-load-tester
  yarn add gql-load-tester
```
  using ts-node is advised (https://www.npmjs.com/package/ts-node).
  ``` 
   npm install -g typescript
   npm install -g ts-node
   ```
  Its also possible to run it with node js (not fully tested).
  



#**Usage** 

* Create a `.ts` file. 
* import and run the `loadTester` function and your queries (assuming they are written in typescript).
* run `ts-node <your .ts file>`.

(the process should be similar when using node and using a `.js` file)

#**API**
```
interface ILoadTester {
    apolloConfig: ApolloConfig, // Check apollo client config https://www.npmjs.com/package/@apollo/client
    duration?: number; // in seconds, specified how long the test should run.
                       // If a scenario completes before the duration ends, the scenario will be repeated
                       // Not specifying duration will run the users only once
    scenario: Scenario;
    parallelUsers: number; // number of users running a Scenario at any point in time
}

interface Scenario {
    initialPollingQueries?: PollingQuery[]
    steps: Step[];
}

interface Step { // Steps for the scenario, each step is carried out sequentially
    query?: Query,
    mutation?: Mutation,
    pollingQuery?: PollingQuery[], // polling queries can also be started during a step
    name: string;
}

interface PollingQuery extends Query{
    timer: number // milliseconds
}

```
#**Example**
```
import {gql} from '@apollo/client';

const APP_VERSION_QUERY = gql` // example query
  query version($os: String) {
    version(os: $os) {
      version
    }
  }
`;

export const PROFILE_QUERY = gql`  // example query
  query profile {
     name
  }
`;

loadTester({
        apolloConfig : {
          uri: '<Your Server Url>',
          headers: { authorization: `Bearer XXXX`}
        },
        parallelUsers: 20,
        duration: 20,
        scenario:{
          steps:[{ 
              name: 'Profile',
              query: {
                 query: PROFILE_QUERY
              }
          },
          {
             name: 'AppVersion Query', 
             query: {
                   query: APP_VERSION_QUERY, variables: {os: 'ios'}
             }
          }]
       }
 })
```
