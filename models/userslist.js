let mongoose=require('mongoose')



let dbschema=mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    resetid:{
        type:String,
        default:"not yet reset"
    }
})

var userdata=mongoose.model("datas",dbschema)

module.exports={userdata}
