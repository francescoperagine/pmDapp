pragma solidity >=0.4.22;

import './Proxy.sol';

contract UpgradeabilityProxy is Proxy {

    bytes32 private constant implementationPosition = keccak256("ThesisManager.proxy.implementation");

    event LogUpgrade(address indexed implementation);

    function implementation() public override view returns(address _implementation) {
        bytes32 position = implementationPosition;
        assembly {
            _implementation := sload(position)
        }
    }

    function setImplementation(address _newImplementation) internal {
        bytes32 position = implementationPosition;
        assembly {
            sstore(position, _newImplementation)
        }
    }

    /**
    * @dev Upgrades the implementation address
    * @param _newImplementation representing the address of the new implementation to be set
    */
    function _upgradeTo(address _newImplementation) internal {
        address currentImplementation = implementation();
        require(currentImplementation != _newImplementation);
        setImplementation(_newImplementation);
        emit LogUpgrade(_newImplementation);
    }
}