// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BaseMemoryCapsule {
    uint256 public constant MIN_UNLOCK_DELAY = 1 days;
    uint256 public constant MAX_UNLOCK_DELAY = 3650 days;
    uint256 public nextCapsuleId = 1;

    struct Capsule {
        address creator;
        uint256 unlocksAt;
        bool opened;
        string title;
        string message;
    }

    mapping(uint256 => Capsule) private capsules;

    event CapsuleCreated(
        uint256 indexed capsuleId,
        address indexed creator,
        uint256 unlocksAt,
        string title
    );
    event CapsuleOpened(uint256 indexed capsuleId, address indexed opener);

    function createCapsule(
        string calldata title,
        string calldata message,
        uint256 unlockDelaySeconds
    ) external returns (uint256 capsuleId) {
        require(bytes(title).length > 0 && bytes(title).length <= 50, "Invalid title");
        require(bytes(message).length > 0 && bytes(message).length <= 280, "Invalid message");
        require(
            unlockDelaySeconds >= MIN_UNLOCK_DELAY && unlockDelaySeconds <= MAX_UNLOCK_DELAY,
            "Invalid unlock delay"
        );

        capsuleId = nextCapsuleId++;
        capsules[capsuleId] = Capsule({
            creator: msg.sender,
            unlocksAt: block.timestamp + unlockDelaySeconds,
            opened: false,
            title: title,
            message: message
        });

        emit CapsuleCreated(capsuleId, msg.sender, block.timestamp + unlockDelaySeconds, title);
    }

    function openCapsule(uint256 capsuleId) external {
        Capsule storage capsule = capsules[capsuleId];
        require(capsule.creator != address(0), "Capsule not found");
        require(block.timestamp >= capsule.unlocksAt, "Capsule still sealed");
        require(!capsule.opened, "Capsule already opened");

        capsule.opened = true;

        emit CapsuleOpened(capsuleId, msg.sender);
    }

    function getCapsule(
        uint256 capsuleId
    )
        external
        view
        returns (
            address creator,
            uint256 unlocksAt,
            bool opened,
            string memory title,
            string memory message
        )
    {
        Capsule storage capsule = capsules[capsuleId];
        return (
            capsule.creator,
            capsule.unlocksAt,
            capsule.opened,
            capsule.title,
            capsule.message
        );
    }
}
