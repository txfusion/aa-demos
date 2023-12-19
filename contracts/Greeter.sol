// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Greeter {
    struct GreetMsg {
        string greeting;
        string language;
    }

    mapping(string => GreetMsg) private greetings;

    constructor(string memory _lang, string memory _greeting) {
        greetings[_lang] = GreetMsg(_greeting, _lang);
    }

    function greet(string memory _lang) public view returns (string memory, string memory) {
        return ( greetings[_lang].language, greetings[_lang].greeting);
    }

    function setGreeting(string memory _lang, string memory _greeting) public {
        greetings[_lang] = GreetMsg(_greeting, _lang);
    }

}
