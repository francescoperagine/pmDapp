pragma solidity >=0.4.22;

import "./ThesisLib.sol";

contract Storage {

    struct Department {
        uint id;
        string name;
        uint secretariatCounter;
        uint thesisCounter;
        mapping(uint => uint) secretariatCounterToIndex;
        mapping(uint => uint) thesisCounterToIndex;
    }

    uint departmentCounter;
    mapping(uint => bytes32) departmentIndex;
    mapping(bytes32 => Department) departmentMap;

    struct Secretariat {
        bool active;
        uint id;
        uint department;
    }

    uint secretariatCounter;
    mapping(uint => bytes32) secretariatIndex;
    mapping(bytes32 => Secretariat) secretariatMap;

    struct Stakeholder {
        uint thesisCounter;
        uint thesisCompleted;
        mapping(uint => uint) thesisCounterToIndex;
    }
    mapping(uint => bytes32) stakeholderIndex;
    mapping(bytes32 => Stakeholder) stakeholderMap;

    uint thesisCounter;
    mapping(uint => bytes32) thesisIndex;
    mapping(bytes32 => ThesisLib.Thesis) thesisMap;
}