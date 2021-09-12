pragma solidity >=0.4.22;

library ThesisLib {

    struct Thesis {
        bytes32 department;
        bytes32 secretariat;
        bytes32 author;
        bytes32 supervisor;
        uint registrationDate;
        uint publicationDate;       //  @dev UTC date of the official publication or public discussion.
        uint embargoPeriod;         //  @dev UTC date of availability of the thesis.
        bytes fileUrl;              //  @dev hosted IPFS URL
        Status status;
        // bytes signature;
        mapping(bytes32 => bool) permissionMap;
    }

    enum Status {IN_PROGRESS, COMPLETED, CANCELED}

    function setArguments(Thesis storage _self, uint _publicationDate, uint _embargoPeriod, bytes memory _fileUrl) internal {
        _self.publicationDate = _publicationDate;
        _self.embargoPeriod = _embargoPeriod;
        _self.fileUrl = _fileUrl;
        _self.status = Status.IN_PROGRESS;
    }

    function setPermission(Thesis storage _self, bytes32 sender, bool _permission) internal {
        require(isActive(_self), "Procedure advancement has to be in progress.");

        _self.permissionMap[sender] = _permission;
    }

    function canBeFinalized(Thesis storage _self) internal view returns(bool) {
        require(isActive(_self), "Procedure advancement has to be in progress.");

        return(_self.permissionMap[_self.secretariat] &&
            _self.permissionMap[_self.author] &&
            _self.permissionMap[_self.supervisor] &&
            _self.fileUrl.length > 0);
    }

    function finalize(Thesis storage _self/*, bytes memory _signature*/) internal {
        require(canBeFinalized(_self), "Some permissions are still missing to finalize this thesis.");
        _self.status = Status.COMPLETED;
        // _self.signature = _signature;
    }

    function getPermissionStatus(Thesis storage _self) internal view returns(bool secretariat, bool author, bool supervisor) {
        return (_self.permissionMap[_self.secretariat], _self.permissionMap[_self.author], _self.permissionMap[_self.supervisor]);
    }

    function getPermission(Thesis storage _self, bytes32 _stakeholder) internal view returns(bool) {
        return _self.permissionMap[_stakeholder];
    }

    function isActive(Thesis storage _self) internal view returns(bool) {
        return _self.status == Status.IN_PROGRESS;
    }

    function isRegistered(Thesis storage _self) internal view returns(bool) {
        return _self.registrationDate > 0;
    }

    modifier isComplete(Thesis storage _self) {
        require(_self.status == Status.COMPLETED, "Procedure is not completed.");
        _;
    }

    function isStakeholder(Thesis storage _self, bytes32 sender) internal view returns(bool) {
        return sender == _self.secretariat || sender == _self.author || sender == _self.supervisor;
    }

    function isSecretariat(Thesis storage _self, bytes32 sender) internal view returns(bool) {
        return sender == _self.secretariat;
    }

    function isAuthor(Thesis storage _self, bytes32 sender) internal view returns(bool) {
        return sender == _self.author;
    }

    function isSupervisor(Thesis storage _self, bytes32 sender) internal view returns(bool) {
        return sender == _self.supervisor;
    }
}