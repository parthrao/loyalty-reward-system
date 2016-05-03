var server = require('../server/server');
var ds = server.dataSources.mysqlDs;
var lbTables = ['User', 'AccessToken', 'ACL', 'RoleMapping', 'Role','Admin','Customer','Business','Member','Customer_Visit','Customer_Points','Store','Customer_Other_Rewards','Customer_Reward_History','Business_Reward','Business_Redemption_Menu','Business_Redemption_History','Business_Discount_On_Spent','Business_Customer_Category','Business_Happy_Hours','Business_reward_Allocation_History','Business_Ratings_Review','Business_Event','Business_Fan_Wall','Customer_Social_Media','Business_Pictures','Business_Target','Business_Spent_System','Business_Spent_Rule_Allocation_History'];
ds.automigrate(lbTables, function(er) {
  if (er) throw er;
  console.log('Loopback tables [' + lbTables + '] created in ', ds.adapter.name);
  ds.disconnect();
});
