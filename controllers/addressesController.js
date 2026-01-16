import User from '../models/User.js';

const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.addresses || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const addAddress = async (req, res) => {
  try {
    const {
      label,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault,
    } = req.body;

    if (!addressLine1 || !city || !postalCode || !country) {
      return res.status(400).json({ message: 'addressLine1, city, postalCode, and country are required' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const address = {
      label,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault: Boolean(isDefault),
    };

    if (address.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    user.addresses.push(address);

    if (!user.addresses.some((addr) => addr.isDefault)) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(201).json(user.addresses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const updateAddress = async (req, res) => {
  try {
    const addressId = req.params.id;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const {
      label,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault,
    } = req.body;

    if (label !== undefined) {
      address.label = label;
    }
    if (fullName !== undefined) {
      address.fullName = fullName;
    }
    if (phone !== undefined) {
      address.phone = phone;
    }
    if (addressLine1 !== undefined) {
      address.addressLine1 = addressLine1;
    }
    if (addressLine2 !== undefined) {
      address.addressLine2 = addressLine2;
    }
    if (city !== undefined) {
      address.city = city;
    }
    if (state !== undefined) {
      address.state = state;
    }
    if (postalCode !== undefined) {
      address.postalCode = postalCode;
    }
    if (country !== undefined) {
      address.country = country;
    }

    if (isDefault !== undefined) {
      if (isDefault) {
        user.addresses.forEach((addr) => {
          addr.isDefault = false;
        });
        address.isDefault = true;
      } else {
        address.isDefault = false;
      }
    }

    await user.save();

    res.json(user.addresses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const wasDefault = address.isDefault;

    address.remove();

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.json(user.addresses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const addressId = req.params.id;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    user.addresses.forEach((addr) => {
      addr.isDefault = addr._id.toString() === addressId;
    });

    await user.save();

    res.json(user.addresses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export { getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress };

