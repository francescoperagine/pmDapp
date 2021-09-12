pragma solidity >=0.4.22;

contract Base {

    function bytes32ToAddress(bytes32 _address) public pure returns(address) {
        return address(uint160(uint(_address)));
    }

    function addressToBytes32(address _address) public pure returns(bytes32) {
        return bytes32(uint(uint160(_address)));
    }
}

