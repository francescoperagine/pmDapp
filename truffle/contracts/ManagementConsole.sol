pragma solidity >=0.4.22;

import "./Base.sol";
import "./OwnedUpgradeabilityProxy.sol";
import "./Storage.sol";
import "./ThesisLib.sol";

contract ManagementConsole is Base, OwnedUpgradeabilityProxy, Storage {

    using ThesisLib for ThesisLib.Thesis;

    event LogCreateDepartment(bytes32 indexed department, string name, uint indexed id);
    event LogCreateSecretariat(bytes32 indexed department, bytes32 indexed secretariat, uint index);
    event LogCreateThesis(bytes32 indexed department, bytes32 indexed secretariat, bytes32 author,
        bytes32 supervisor, bytes32 thesisHash, uint index);
    event LogRemoveSecretariat(bytes32 indexed sender, bytes32 indexed secretariat);
    event LogAssignTo(bytes32 indexed _stakeholder, bytes32 indexed _thesisHash);
    event LogUpdateThesis(bytes32 indexed thesis, string action);
    event LogFinalizeThesis(bytes32 indexed thesis/*, bytes indexed signature*/, string action);
    event LogUpdateDepartmentNewThesis(uint departmentThesisCount, uint thesisIndex);

    function createDepartment(bytes32 _address, string calldata _name) external onlyProxyOwner {
        require(departmentMap[_address].id == 0,"Department address already in use.");

        Department memory department = Department(++departmentCounter,_name, 0, 0);
        departmentMap[_address] = department;
        departmentIndex[department.id] = _address;
        emit LogCreateDepartment(_address, _name, departmentMap[_address].id);
    }

    /**
    *   @dev Every secretariat can be assigned to a single department.
    *       If a secretariat was previously deleted from a department, the new counter
    *       is linked to the secretariat index.
    */

    function createSecretariat(bytes32 _address) external onlyDepartment {
        require(!isSecretariat(_address), "Secretariat address already in use.");

        Department storage department = departmentMap[addressToBytes32(msg.sender)];
        uint index = ++secretariatCounter;
        Secretariat memory secretariat = Secretariat(true, index, department.id);
        secretariatMap[_address] = secretariat;
        secretariatIndex[index] = _address;
        department.secretariatCounterToIndex[++department.secretariatCounter] = index;
        emit LogCreateSecretariat(departmentIndex[department.id], _address, index);
    }

    /**
    * @dev  Does not remove the department ID to  the secretariat from the department counter,
    *       because that would mess up the index.
     */

    function removeSecretariat(bytes32 _secretariat) external onlyDepartment {
        require(isSecretariat(_secretariat) && departmentIndex[secretariatMap[_secretariat].department] == addressToBytes32(msg.sender),
            "Secretariat not associated to the current department.");

        Department storage department = departmentMap[addressToBytes32(msg.sender)];
        Secretariat storage secretariat = secretariatMap[_secretariat];
        secretariat.active = false;
        delete department.secretariatCounterToIndex[secretariat.id];
        emit LogRemoveSecretariat(addressToBytes32(msg.sender), _secretariat);
    }

    function getDepartmentList() external view returns(bytes32[] memory departments) {
        departments = new bytes32[](departmentCounter);
        for(uint i = 0; i < departmentCounter; i++) {
            departments[i] = departmentIndex[i + 1];
        }
    }

    function getDepartmentDetails(bytes32 _department) external view returns
        (uint departmentID, string memory departmentName, uint secretariatCounter, uint thesisCounter) {
        require(isDepartment(_department), "Address does not match any department.");
        Department storage department = departmentMap[_department];
        return (department.id, department.name, department.secretariatCounter, department.thesisCounter);
    }

    function getSecretariatList(bytes32 _department) external view returns(bytes32[] memory secretariats) {
        require(isDepartment(_department), "Address does not match any department.");

        secretariats = new bytes32[](departmentMap[_department].secretariatCounter);
        uint counter;
        for(uint i = 0; i < secretariats.length; i++) {
            uint pointer = departmentMap[_department].secretariatCounterToIndex[i+1];
            if(secretariatMap[secretariatIndex[pointer]].active == true){
                secretariats[counter++] = secretariatIndex[pointer];
            }
        }
    }

    function createThesis(bytes32 _author, bytes32 _supervisor,
        uint _registrationDate, string calldata _title, string calldata _course)
        external onlySecretariat {

        bytes32 secretariat = addressToBytes32(msg.sender);
        bytes32 departmentAddress = getDepartmentOfSecretariat(secretariat);
        Department storage department = departmentMap[departmentAddress];

        bytes32 thesisHash = keccak256(abi.encodePacked(departmentAddress, secretariat,
            _author, _supervisor, _registrationDate, _title, _course));

        thesisMap[thesisHash].department = departmentAddress;
        thesisMap[thesisHash].secretariat = secretariat;
        thesisMap[thesisHash].author = _author;
        thesisMap[thesisHash].supervisor = _supervisor;
        thesisMap[thesisHash].registrationDate = _registrationDate;
        thesisIndex[++thesisCounter] = thesisHash;

        department.thesisCounterToIndex[++department.thesisCounter] = thesisCounter;
        emit LogUpdateDepartmentNewThesis(department.thesisCounter, thesisCounter);
        assignTo([secretariat, _author, _supervisor], thesisCounter);
        emit LogCreateThesis(departmentAddress, secretariat, _author, _supervisor, thesisHash, thesisCounter);
    }

    function assignTo(bytes32[3] memory _stakeholder, uint _thesisIndex) private {
        // require(checkUniqueness(_stakeholder), "Stakeholders addresses must be unique.");
        for(uint i = 0; i < _stakeholder.length; i++) {
            Stakeholder storage stakeholder = stakeholderMap[_stakeholder[i]];
            stakeholder.thesisCounter++;
            stakeholder.thesisCounterToIndex[stakeholder.thesisCounter] = _thesisIndex;
            emit LogAssignTo(_stakeholder[i], thesisIndex[_thesisIndex]);
        }
    }

    function setThesisArguments(bytes32 _thesisHash, uint _publicationDate, uint _embargoPeriod, bytes calldata _fileUrl)
        external onlySecretariat thesisExists(_thesisHash) {

        require(getDepartmentOfSecretariat(addressToBytes32(msg.sender)) != '0x0', "Not a secretariat for the department");
        thesisMap[_thesisHash].setArguments(_publicationDate, _embargoPeriod, _fileUrl);
        emit LogUpdateThesis((addressToBytes32(address(this))), "setArguments");
    }

    function getDepartmentOfSecretariat(bytes32 _secretariat) public view returns(bytes32 department) {
        require(isSecretariat(_secretariat),"Not a secretariat.");
        return departmentIndex[secretariatMap[_secretariat].department];
    }

    function setPermission(bytes32 _thesisHash, bool _permission) external thesisExists(_thesisHash) onlyStakeholder(_thesisHash) {
        bytes32 sender = addressToBytes32(msg.sender);
        thesisMap[_thesisHash].setPermission(sender, _permission);
        emit LogUpdateThesis(sender, "setPermission");
    }

    function getThesisPermissionStatus(bytes32 _thesisHash) external view thesisExists(_thesisHash)
        returns (bool secretariat, bool author, bool supervisor) {

        return thesisMap[_thesisHash].getPermissionStatus();
    }

    function getThesisPermission(bytes32 _thesisHash) external view returns(bool) {
        return thesisMap[_thesisHash].getPermission(addressToBytes32(msg.sender));
    }

    function thesisCanBeFinalized(bytes32 _thesisHash) external thesisExists(_thesisHash) view returns(bool) {
        return thesisMap[_thesisHash].canBeFinalized();
    }

    function finalizeThesis(bytes32 _thesisHash) external onlySecretariat thesisExists(_thesisHash) returns(bool success) {
        require(getDepartmentOfSecretariat(addressToBytes32(msg.sender)) == thesisMap[_thesisHash].department,
            "Secretariat department does not match with the thesis department.");
        thesisMap[_thesisHash].finalize();
        stakeholderMap[thesisMap[_thesisHash].secretariat].thesisCompleted++;
        stakeholderMap[thesisMap[_thesisHash].author].thesisCompleted++;
        stakeholderMap[thesisMap[_thesisHash].supervisor].thesisCompleted++;
        emit LogFinalizeThesis(_thesisHash, "Finalized");
        return true;
    }

    function getFileUrl(bytes32 _thesisHash) external view returns(bytes memory) {
        if(!isStakeholderOfThesis(_thesisHash)) {
            require((thesisMap[_thesisHash].publicationDate + thesisMap[_thesisHash].embargoPeriod) < now, "Embargo period is not over yet.");
        }
        return thesisMap[_thesisHash].fileUrl;
    }

    function verifySecretariatSignature(bytes32 _thesisHash, bytes32 _messageHash, bytes calldata _signature)
        external thesisExists(_thesisHash) view returns(bool) {

        require(thesisMap[_thesisHash].status == ThesisLib.Status.COMPLETED, "Thesis is not yet finalized.");
        return addressToBytes32(recoverSigner(_messageHash, _signature)) == thesisMap[_thesisHash].secretariat;
    }

    /**
    * @dev Recover signer address from a message by using their signature
    * @dev hash bytes32 message, the hash is the signed message. What is recovered is the signer address.
    * @dev sig bytes signature, the signature is generated using web3.eth.sign(). Inclusive "0x..."
    */

    function recoverSigner(bytes32 _messageHash, bytes memory _signature) public pure returns (address) {
        require(_signature.length == 65, "Require correct length");

        bytes32 r;
        bytes32 s;
        uint8 v;
        // Divide the signature in r, s and v variables
        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(_signature, 32))
            // second 32 bytes
            s := mload(add(_signature, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(_signature, 96)))
        }
        // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
        if (v < 27) {
            v += 27;
        }
        require(v == 27 || v == 28, "Signature version not match");
        return recoverSigner2(_messageHash, v, r, s);
    }

    function recoverSigner2(bytes32 _messageHash, uint8 v, bytes32 r, bytes32 s) private pure returns (address) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, _messageHash));
        address addr = ecrecover(prefixedHash, v, r, s);

        return addr;
    }

    function getThesisOfDepartment(bytes32 _department) external view returns(bytes32[] memory thesisList) {
        require(isDepartment(_department), "Address does not match any department.");
        thesisList = new bytes32[](departmentMap[_department].thesisCounter);
        for(uint i = 0; i < thesisList.length; i++) {
            uint index = departmentMap[_department].thesisCounterToIndex[i];
            thesisList[i] = thesisIndex[index];
        }
    }

    function getThesis(bytes32 _thesisHash) public view thesisExists(_thesisHash)
        returns(bytes32 department, bytes32 secretariat, bytes32 author, bytes32 supervisor,
            uint registrationDate, uint publicationDate) {

        ThesisLib.Thesis storage t = thesisMap[_thesisHash];

        return(t.department, t.secretariat, t.author, t.supervisor, t.registrationDate,
            t.publicationDate);
    }

    function getThesisOfStakeholder(bytes32 _stakeholder) external view returns(bytes32[] memory thesisList) {
        require(isStakeholder(_stakeholder), "Stakeholder not registered.");
        Stakeholder storage stakeholder = stakeholderMap[_stakeholder];
        thesisList = new bytes32[](stakeholder.thesisCounter - stakeholder.thesisCompleted);
        uint counter;
        uint index;
        for(uint i = 1; i < thesisList.length + 1; i++) {
            index = stakeholder.thesisCounterToIndex[i];
            bytes32 t_address = thesisIndex[index];
            if(thesisMap[t_address].isActive()) {
                thesisList[counter++] = t_address;
            }
        }
    }

    modifier thesisExists(bytes32 _thesisHash) {
        require(thesisMap[_thesisHash].isRegistered(), "Thesis not registered.");
        _;
    }

    modifier onlyStakeholder(bytes32 _thesisHash) {
        require(isStakeholderOfThesis(_thesisHash), "User is not a valid stakeholder.");
        _;
    }

    function isStakeholderOfThesis(bytes32 _thesisHash) public view returns(bool) {
        bytes32 sender = addressToBytes32(msg.sender);
        return (isStakeholder(sender) && thesisMap[_thesisHash].isStakeholder(sender) == true);
    }

    function isStakeholder(bytes32 _sender) public view returns(bool) {
        return stakeholderMap[_sender].thesisCounter > 0;
    }

    modifier onlyDepartment() {
        require(isDepartment(addressToBytes32(msg.sender)), "Department does not exists.");
        _;
    }

    function isDepartment(bytes32 _department) public view returns(bool) {
        return departmentMap[_department].id > 0;
    }

    modifier onlySecretariat() {
        require(isSecretariat(addressToBytes32(msg.sender)), "Not a secretariat.");
        _;
    }

    function isSecretariat(bytes32 _secretariat) public view returns(bool) {
        return secretariatMap[_secretariat].active == true;
    }
}