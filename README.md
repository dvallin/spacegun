# Spacegun

Space age deployment manager to get your docker images to kubernetes, without the headaches of fancy ui.

## Getting Started

If you only want the cli you can install it with

```
npm install -g spacegun
```

and then run it from the console. The help message should get you started

### Installing

Just run 

```
yarn build
```

then you can run the cli with

```
node bin/spacegun
```

## Running the tests

run the tests with

```
yarn test
```

## Authors

* **Maximilian Schuler** - *Initial work* - [dvallin](https://github.com/dvallin)


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Dependencies

* [@kubernetes/client-node](https://github.com/kubernetes-client/javascript)
* [axios](https://github.com/axios/axios)
* [chalk](https://github.com/chalk/chalk)
* [command-line-args](https://github.com/75lb/command-line-args)
* [lodash](https://github.com/lodash/lodash)
* [ora](https://github.com/sindresorhus/ora)
