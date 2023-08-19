const express = require("express");
const path = require("path");
const Shop = require("../model/shop");
const router = express.Router();
const { upload } = require("../multer");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const sendShopToken = require("../utils/shopToken");
const { isSeller } = require("../middleware/auth");


// create shop
router.post("/create-shop", upload.single("file"), async (req, res, next) => {
  try {
    const { email } = req.body;
    const sellerEmail = await Shop.findOne({ email });

    if (sellerEmail) {
      const filename = req.file.filename;
      const filePath = `uploads/${filename}`;
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err);
          res.status(500).json({ message: "Error deleting file" });
        }
      });

      return next(new ErrorHandler("Shop already exists", 400));
    }
    const filename = req.file.filename;
    const fileUrl = path.join(filename);

    const seller = {
      name: req.body.name,
      email: email,
      password: req.body.password,
      avatar: fileUrl,
      address: req.body.address,
      phoneNumber: req.body.phoneNumber,
      zipCode: req.body.zipCode,
    };
    const activationToken = createActivationToken(seller);

    const activationUrl = `http://localhost:8000/seller/activation/${activationToken}`;

    try {
      await sendMail({
        email: seller.email,
        subject: "Activate your account",
        message: `Hello ${seller.name}, please click the link to activate your shop: ${activationUrl}`,
      });

      res.status(201).json({
        success: true,
        message: `please check your email :- ${seller.email} to activate your shop. `,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// creating activation token
const createActivationToken = (seller) => {
  return jwt.sign(seller, process.env.ACTIVATION_SECRET, {
    expiresIn: "10m",
  });
};

// activating shop
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activation_token } = req.body;

      const newSeller = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      if (!newSeller) {
        return next(new ErrorHandler("Invalid token", 400));
      }

      const { name, email, password, avatar, zipCode, address, phoneNumber } =
        newSeller;

      let seller = await Shop.findOne({ email });

      if (seller) {
        return next(new ErrorHandler("Shop already exists", 400));
      }

      seller = await Shop.create({
        name,
        email,
        password,
        avatar,
        zipCode,
        address,
        phoneNumber,
      });
      sendShopToken(seller, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// login shop
router.post(
    "/login-shop",
    catchAsyncErrors(async (req, res, next) => {
      try {
        const { email, password } = req.body;
  
        if (!email || !password) {
          return next(
            new ErrorHandler("Please provide all the necessary credentials", 400)
          );
        }
  
        const user = await Shop.findOne({ email }).select("+password");
  
        if (!user) {
          return next(new ErrorHandler("User doesn't exist", 400));
        }
        const isPasswordValid = await user.comparePassword(password);
  
        if (!isPasswordValid) {
          return next(new ErrorHandler("Incorrect Password", 400));
        }
  
        sendShopToken(user, 201, res);
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
    })
  );

// load shop
router.get(
    "/getSeller",
    isSeller,
    catchAsyncErrors(async (req, res, next) => {
      try {
        const seller = await Shop.findById(req.seller._id);
        // console.log('seller', seller )
  
        if (!seller) {
          return next(new ErrorHandler("User doesn't exist", 400));
        }
  
        res.status(200).json({
          success: true,
          seller,
        });
      } catch (error) {
        // console.log(error)
        return next(new ErrorHandler(error.message, 500));
        
      }
    })
  );

  // logout from shop
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("seller_token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      });

      res.status(201).json({
        success: true,
        message: "Logging out successful",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
