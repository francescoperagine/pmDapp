pragma solidity >=0.4.22;

import "./ThesisLib.sol";

contract Thesis {

    ThesisLib.Thesis thesis;

    constructor(bytes32 _secretariat, bytes32 _author, bytes32 _supervisor, uint _registrationDate,
        uint _publicationDate, uint _embargoPeriod, bytes memory _fileUrl) public {

        thesis.secretariat = _secretariat;
        thesis.author = _author;
        thesis.supervisor = _supervisor;
        thesis.registrationDate = _registrationDate;
        thesis.publicationDate = _publicationDate;
        thesis.embargoPeriod = _embargoPeriod;
        thesis.fileUrl = _fileUrl;
    }

}