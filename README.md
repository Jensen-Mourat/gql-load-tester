#gql-load-tester

Load tester to simulate graphql based api (works only with Apollo queries) with uses the apollo client internally. Scenarios can be used to simulate user behaviours.

#**Installation**
```
  npm i gql-load-tester
```


#**Usage** 

import and run the ```LoadTester``` function

#**API**
```

LoadTester({
   apolloConfig: ApolloConfig, // Check apollo client config https://www.npmjs.com/package/@apollo/client
   scenario: Scenario
});

interface Scenario {
    initialPollingQueries?: PollingQuery[] // a polling queries can be also initialised
    steps: Step[];
    runtime: number; // amount of time the scenario will run (in ms)
    repeat: number; // amount of times the scenario is repeated
    deferBy?: number; // interval between repeating scenarios
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
#**Example **
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

LoadTester({
        apolloConfig : {
          uri: '<Your Server Url>',
          headers: { authorization: `XXXX`}
        },
        scenario:{
          runtime: 2000, 
          repeat: 5, 
          deferBy: 500, 
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
