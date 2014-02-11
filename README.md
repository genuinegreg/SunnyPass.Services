SunnyPass.Services
==========
Angularjs services for my SunnyPass projects.

SunnyPass Crypto
-----------
Google CryptoJs wrapper

 * encrypt(key, dada) : AES encryption
 * decrypt(key, encryptedData) : AES decryption
 * generateKey(length = 256) : generate a random  hex key (default to 256bits)
 * hash(string, length = 256) : hash string using sha3 (default length to 256bits)
 * deriveEncryptionKey(password, seed) : derive an encryption key from a passphrase and a seed using PBKDF2 algo (length to 512bits, 200 iterations)

SunnyPass Secret
----------
Simple private/shared secret utils;

SunnyPass Locker
--------------
Locker class.

Each locker is identified by a secret key, shared with a shared secret.
Secret key and a passphrase is required to acces lockers data.


SunnyPass
--------
Locker manager


